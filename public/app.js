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
        
		 getAverageRating(idea) {
            if (!idea || typeof idea.average_rating === 'undefined') {
                return 'N/A';
            }
            // The average is now pre-calculated on the backend
            return idea.average_rating > 0 ? idea.average_rating.toFixed(1) : '0.0';
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
                        const userData = JSON.parse(localStorage.getItem('innov8_user'));
                        this.user = userData;
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
                    localStorage.setItem('innov8_user', JSON.stringify(data.user));
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
                    localStorage.setItem('innov8_user', JSON.stringify(data.user));
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
            localStorage.removeItem('innov8_user');
            this.user = null;
            this.ideas = [];
            this.showNotification('Logged out successfully', 'success');
        },
        
        // Ideas
        async loadIdeas() {
            if (!this.user) return;
            
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
                    // Reset filters to ensure the new idea is visible
                    this.filters = {
                        category: '',
                        status: '',
                        search: ''
                    };
                    // No need to reload all ideas. Just add the new one to the top.
                    // This is faster and avoids potential race conditions.
                    this.ideas.unshift(data.idea);
                    this.showNotification('Idea shared successfully!', 'success');
                } else {
                    this.showNotification(data.error || 'Failed to create idea', 'error');
					 console.log(data.error)
                }
            } catch (error) {
                this.showNotification('Network error. Please try again.', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async selectIdea(idea) {
            console.log('Attempting to select idea:', JSON.stringify(idea, null, 2));
            try {
                const token = localStorage.getItem('innov8_token');
                // Fetch detailed idea information
                const response = await fetch(`/api/ideas/${idea.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
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
                    this.selectedIdea.validation = data.validation;
                    this.selectedIdea.status = 'validated';

                    // Also update the status in the main ideas list to refresh the card
                    const ideaInList = this.ideas.find(i => i.id === idea.id);
                    if (ideaInList) {
                        ideaInList.status = 'validated';
                    }
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

        async rateIdea(idea, rating) {
            try {
                const token = localStorage.getItem('innov8_token');
                const response = await fetch(`/api/ideas/${idea.id}/rate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ rating })
                });

                const data = await response.json();

                if (response.ok) {
                    // Update the selected idea's rating info
                    this.selectedIdea.average_rating = data.average_rating;
                    this.selectedIdea.ratings_count = data.ratings_count;

                    // Also update the idea in the main list for UI reactivity
                    const ideaInList = this.ideas.find(i => i.id === idea.id);
                    if (ideaInList) {
                        ideaInList.average_rating = data.average_rating;
                    }
                    this.showNotification('Your rating has been submitted!', 'success');
                } else {
                    this.showNotification(data.error || 'Failed to submit rating', 'error');
                }
            } catch (error) {
                this.showNotification('Network error while rating.', 'error');
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
                    if (data.liked) {
                        this.selectedIdea.likes_count = (this.selectedIdea.likes_count || 0) + 1;
                    } else {
                        this.selectedIdea.likes_count = Math.max(0, (this.selectedIdea.likes_count || 0) - 1);
                    }

                    // Update in ideas list too
                    const ideaInList = this.ideas.find(i => i.id === idea.id);
                    if (ideaInList) {
                        ideaInList.likes_count = this.selectedIdea.likes_count;
                    }
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
                        content: this.commentForm.content
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Add comment to the list
                    this.selectedIdea.comments = this.selectedIdea.comments || [];
                    this.selectedIdea.comments.unshift(data.comment);
                    this.selectedIdea.comments_count = (this.selectedIdea.comments_count || 0) + 1;

                    // Update in ideas list
                    const ideaInList = this.ideas.find(i => i.id === idea.id);
                    if (ideaInList) {
                        ideaInList.comments_count = this.selectedIdea.comments_count;
                        // Re-fetch comments to update average rating display if needed
                        ideaInList.comments = this.selectedIdea.comments;
                    }

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
