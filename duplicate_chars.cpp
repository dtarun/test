#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

void findDuplicateCharacters(const string& str) {
    // Map to store character frequencies
    unordered_map<char, int> charCount;
    
    // Count frequency of each character
    for (char c : str) {
        charCount[c]++;
    }
    
    // Vector to store duplicate characters and their counts
    vector<pair<char, int>> duplicates;
    
    // Find characters that appear more than once
    for (const auto& pair : charCount) {
        if (pair.second > 1) {
            duplicates.push_back({pair.first, pair.second});
        }
    }
    
    // Display results
    if (duplicates.empty()) {
        cout << "No duplicate characters found." << endl;
    } else {
        cout << "Duplicate characters found:" << endl;
        cout << "Character | Occurrences" << endl;
        cout << "----------|------------" << endl;
        
        for (const auto& dup : duplicates) {
            cout << "    " << dup.first << "     |     " << dup.second << endl;
        }
    }
}

int main() {
    string input;
    char choice;
    
    do {
        cout << "\n=== Duplicate Character Finder ===" << endl;
        cout << "Enter a string: ";
        
        // Clear the input buffer
        cin.ignore();
        getline(cin, input);
        
        if (input.empty()) {
            cout << "Empty string entered. Please enter a valid string." << endl;
        } else {
            cout << "\nAnalyzing string: \"" << input << "\"" << endl;
            cout << "String length: " << input.length() << " characters" << endl;
            cout << endl;
            
            findDuplicateCharacters(input);
        }
        
        cout << "\nDo you want to check another string? (y/n): ";
        cin >> choice;
        
    } while (choice == 'y' || choice == 'Y');
    
    cout << "Thank you for using the Duplicate Character Finder!" << endl;
    
    return 0;
}
