#include <iostream>
using namespace std;

struct Node {
    int data;
    Node* left;
    Node* right;
    
    Node(int value) {
        data = value;
        left = nullptr;
        right = nullptr;
    }
};

class BST {
private:
    Node* root;
    
    Node* insert(Node* node, int value) {
        if (node == nullptr) {
            return new Node(value);
        }
        
        if (value < node->data) {
            node->left = insert(node->left, value);
        } else if (value > node->data) {
            node->right = insert(node->right, value);
        }
        
        return node;
    }
    
    Node* search(Node* node, int value) {
        if (node == nullptr || node->data == value) {
            return node;
        }
        
        if (value < node->data) {
            return search(node->left, value);
        }
        
        return search(node->right, value);
    }
    
    void inorder(Node* node) {
        if (node != nullptr) {
            inorder(node->left);
            cout << node->data << " ";
            inorder(node->right);
        }
    }
    
    Node* findMin(Node* node) {
        while (node->left != nullptr) {
            node = node->left;
        }
        return node;
    }
    
    Node* deleteNode(Node* node, int value) {
        if (node == nullptr) {
            return node;
        }
        
        if (value < node->data) {
            node->left = deleteNode(node->left, value);
        } else if (value > node->data) {
            node->right = deleteNode(node->right, value);
        } else {
            if (node->left == nullptr) {
                Node* temp = node->right;
                delete node;
                return temp;
            } else if (node->right == nullptr) {
                Node* temp = node->left;
                delete node;
                return temp;
            }
            
            Node* temp = findMin(node->right);
            node->data = temp->data;
            node->right = deleteNode(node->right, temp->data);
        }
        return node;
    }
    
public:
    BST() {
        root = nullptr;
    }
    
    void insert(int value) {
        root = insert(root, value);
    }
    
    bool search(int value) {
        return search(root, value) != nullptr;
    }
    
    void remove(int value) {
        root = deleteNode(root, value);
    }
    
    void display() {
        cout << "BST (inorder): ";
        inorder(root);
        cout << endl;
    }
};

int main() {
    BST tree;
    
    // Insert some values
    tree.insert(50);
    tree.insert(30);
    tree.insert(70);
    tree.insert(20);
    tree.insert(40);
    tree.insert(60);
    tree.insert(80);
    
    cout << "Binary Search Tree created!" << endl;
    tree.display();
    
    // Search for values
    cout << "Searching for 40: " << (tree.search(40) ? "Found" : "Not found") << endl;
    cout << "Searching for 25: " << (tree.search(25) ? "Found" : "Not found") << endl;
    
    // Remove a value
    cout << "Removing 30..." << endl;
    tree.remove(30);
    tree.display();
    
    return 0;
}
