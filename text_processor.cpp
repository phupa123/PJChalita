#include <iostream>
#include <string>
#include <sstream>

using namespace std;

void PrintMenu() {
    cout << "MENU" << endl;
    cout << "c - Number of non-whitespace characters" << endl;
    cout << "w - Number of words" << endl;
    cout << "f - Find text" << endl;
    cout << "r - Replace all !'s" << endl;
    cout << "s - Shorten spaces" << endl;
    cout << "q - Quit" << endl;
}

int GetNumOfNonWSCharacters(string text) {
    int count = 0;
    for (char c : text) {
        if (!isspace(c)) {
            count++;
        }
    }
    return count;
}

int GetNumOfWords(string text) {
    istringstream iss(text);
    string word;
    int count = 0;
    while (iss >> word) {
        count++;
    }
    return count;
}

int FindText(string text, string findStr) {
    int count = 0;
    size_t pos = 0;
    while ((pos = text.find(findStr, pos)) != string::npos) {
        count++;
        pos += findStr.length();
    }
    return count;
}

void ReplaceExclamation(string& text) {
    for (char& c : text) {
        if (c == '!') {
            c = '.';
        }
    }
}

void ShortenSpace(string& text) {
    string result;
    bool inSpace = false;
    for (char c : text) {
        if (c == ' ') {
            if (!inSpace) {
                result += ' ';
                inSpace = true;
            }
        } else {
            result += c;
            inSpace = false;
        }
    }
    text = result;
}

void ExecuteMenu(char choice, string& text) {
    if (choice == 'c') {
        cout << "Number of non-whitespace characters: " << GetNumOfNonWSCharacters(text) << endl;
    } else if (choice == 'w') {
        cout << "Number of words: " << GetNumOfWords(text) << endl;
    } else if (choice == 'f') {
        string findStr;
        cin.ignore();
        getline(cin, findStr);
        cout << "\"" << findStr << "\" instances: " << FindText(text, findStr) << endl;
    } else if (choice == 'r') {
        ReplaceExclamation(text);
        cout << "Edited text: " << text << endl;
    } else if (choice == 's') {
        ShortenSpace(text);
        cout << "Edited text: " << text << endl;
    }
}

int main() {
    string sampleText;
    getline(cin, sampleText);
    cout << "You entered: " << sampleText << endl;

    char choice;
    while (true) {
        PrintMenu();
        cout << "Choose an option:" << endl;
        cin >> choice;
        if (choice == 'q') {
            break;
        }
        ExecuteMenu(choice, sampleText);
    }

    return 0;
}
