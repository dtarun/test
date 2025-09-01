function innov8App() {
    return {
        // State
        user: null,
        ideas: [],
        selectedIdea: null,
        loading: false,
        
        // UI State
        showLogin: false,
        showRegister: false,
        showNewIdea: false,
        showIdeaDetail: false,
        
        // Forms
        loginForm: {
            email: '',
            password: ''
        },
        registerForm: {
            name: '',
            email: '',
            password: ''
        },
        ideaForm: {
            title: '',
            description: '',
            category: '',
            tags: ''
        },
        
        // Filters
        filters: {
            category: '',
            status: '',
            search: ''
        },
        
        // Initialize app
        async init() {
            // Check for existing token
            const token = localStorage.getItem('innov8_token');
            if (token) {
                try {
                    const response = await fetch('/api/auth/verify', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.user = data.user;
                        await this.loadIdeas();
                    } else {
                        localStorage.removeItem('innov8_token');
                        localStorage.removeItem('innov8_user');
                    }
                } catch (error) {
                    console.error('Token verification failed:', error);
                    localStorage.removeItem('innov8_token');
                    localStorage.removeItem('innov8_user');
                }
            } else {
                await this.loadIdeas();
            }
        },
        
        // Authentication
        async login() {
            this.loading = true;
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.loginForm)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('innov8_token', data.token);
                    this.user = data.user;
                    this.showLogin = false;
                    this.loginForm = { email: '', password: '' };
                    await this.loadIdeas();
                    this.showNotification('Welcome back!', 'success');
                } else {
                    this.showNotification(data.error || 'Login failed', 'error');
                }
            } catch (error) {
                this.showNotification('Network error. Please try again.', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async register() {
            this.loading = true;
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.registerForm)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('innov8_token', data.token);
                    this.user = data.user;
                    this.showRegister = false;
                    this.registerForm = { name: '', email: '', password: '' };
                    await this.loadIdeas();
                    this.showNotification('Welcome to Innov8!', 'success');
                } else {
                    this.showNotification(data.error || 'Registration failed', 'error');
                }
            } catch (error) {
                this.showNotification('Network error. Please try again.', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        logout() {
            localStorage.removeItem('innov8_token');
            this.user = null;
            this.ideas = [];
            this.showNotification('Logged out successfully', 'success');
        },
        
        // Ideas
        async loadIdeas() {
            this.loading = true;
            try {
                const params = new URLSearchParams();
                if (this.filters.category) params.append('category', this.filters.category);
                if (this.filters.status) params.append('status', this.filters.status);
                if (this.filters.search) params.append('search', this.filters.search);
                
                const response = await fetch(`/api/ideas?${params.toString()}`);
                const data = await response.json();
                
                if (response.ok) {
                    this.ideas = data.ideas || [];
                } else {
                    this.showNotification('Failed to load ideas', 'error');
                }
            } catch (error) {
                this.showNotification('Network error loading ideas', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async createIdea() {
            this.loading = true;
            try {
                const token = localStorage.getItem('innov8_token');
                const response = await fetch('/api/ideas', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ...this.ideaForm,
                        tags: this.ideaForm.tags.split(',').map(t => t.trim()).filter(t => t)
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.showNewIdea = false;
                    this.ideaForm = { title: '', description: '', category: '', tags: '' };
                    await this.loadIdeas();
                    this.showNotification('Idea shared successfully!', 'success');
                } else {
                    this.showNotification(data.error || 'Failed to create idea', 'error');
                }
            } catch (error) {
                this.showNotification('Network error. Please try again.', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async selectIdea(idea) {
            try {
                // Fetch detailed idea information
                const response = await fetch(`/api/ideas/${idea.id}`);
                const data = await response.json();

                if (response.ok) {
                    this.selectedIdea = {
                        ...data.idea,
                        comments: data.comments,
                        validation: data.validation
                    };
                    this.showIdeaDetail = true;
                } else {
                    this.showNotification('Failed to load idea details', 'error');
                }
            } catch (error) {
                this.showNotification('Network error loading idea', 'error');
            }
        },

        async validateIdea(idea) {
            this.loading = true;
            try {
                const token = localStorage.getItem('innov8_token');
                const response = await fetch(`/api/ideas/${idea.id}/validate`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    this.updateIdeaInState(idea.id, {
                        validation: data.validation,
                        status: 'validated'
                    });
                    this.showNotification('AI validation completed!', 'success');
                } else {
                    this.showNotification(data.error || 'Validation failed', 'error');
                }
            } catch (error) {
                this.showNotification('Network error during validation', 'error');
            } finally {
                this.loading = false;
            }
        },

        async likeIdea(idea) {
            try {
                const token = localStorage.getItem('innov8_token');
                const response = await fetch(`/api/ideas/${idea.id}/like`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    this.updateIdeaInState(idea.id, { likes_count: data.liked ? (idea.likes_count || 0) + 1 : Math.max(0, (idea.likes_count || 0) - 1) });
                } else {
                    this.showNotification(data.error || 'Failed to like idea', 'error');
                }
            } catch (error) {
                this.showNotification('Network error', 'error');
            }
        },

        // Comment form
        commentForm: {
            content: '',
            rating: ''
        },

        async addComment(idea) {
            if (!this.commentForm.content.trim()) return;

            try {
                const token = localStorage.getItem('innov8_token');
                const response = await fetch(`/api/ideas/${idea.id}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        content: this.commentForm.content,
                        rating: this.commentForm.rating ? parseInt(this.commentForm.rating) : null
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Add comment to the list
                    this.selectedIdea.comments = this.selectedIdea.comments || [];
                    this.selectedIdea.comments.unshift(data.comment);
                    this.updateIdeaInState(idea.id, { comments_count: (this.selectedIdea.comments_count || 0) + 1 });

                    // Reset form
                    this.commentForm = { content: '', rating: '' };
                    this.showNotification('Comment added successfully!', 'success');
                } else {
                    this.showNotification(data.error || 'Failed to add comment', 'error');
                }
            } catch (error) {
                this.showNotification('Network error', 'error');
            }
        },
        
        // Utility functions
        updateIdeaInState(ideaId, updates) {
            // Update in the main ideas list
            const ideaInList = this.ideas.find(i => i.id === ideaId);
            if (ideaInList) {
                Object.assign(ideaInList, updates);
            }
            // Update in the selected idea detail view
            if (this.selectedIdea && this.selectedIdea.id === ideaId) {
                Object.assign(this.selectedIdea, updates);
            }
        },

        showNotification(message, type = 'info') {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
                type === 'success' ? 'bg-green-500 text-white' :
                type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
            }`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.remove();
            }, 3000);
        },
        
        formatDate(dateString) {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },
        
        getStatusColor(status) {
            const colors = {
                'draft': 'bg-gray-100 text-gray-800',
                'feedback': 'bg-blue-100 text-blue-800',
                'validated': 'bg-green-100 text-green-800',
                'prototype': 'bg-purple-100 text-purple-800'
            };
            return colors[status] || 'bg-gray-100 text-gray-800';
        },
        
        getCategoryIcon(category) {
            const icons = {
                'mobile-app': 'fas fa-mobile-alt',
                'web-app': 'fas fa-globe',
                'ai-ml': 'fas fa-robot',
                'hardware': 'fas fa-microchip',
                'service': 'fas fa-handshake',
                'other': 'fas fa-lightbulb'
            };
            return icons[category] || 'fas fa-lightbulb';
        }
    };
}
