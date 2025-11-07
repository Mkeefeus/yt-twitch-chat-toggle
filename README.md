## Firefox
Firefox has a feature called "Enhanced Tracking Protection" that can sometimes interfere with browser extensions. This feature prevents youtube from accessing third-party cookies automatically, which causes twitch chat to not be logged in when opening a new chat window. You can choose to login each time, and your login will persist through that session. If you want twitch chat to be logged in automatically when opened from youtube, you will need to add an exception for youtube in Firefox's Enhanced Tracking Protection settings. To do that, follow these steps:
1. go to about:preferences#privacy in Firefox or click the menu button (three horizontal lines in the upper-right corner) and select "Settings", then navigate to the "Privacy & Security" panel.
2. Scroll down to the "Enhanced Tracking Protection" section.
3. Click on the "Manage Exceptions..." button.
4. In the "Address of website" field, enter `https://www.youtube.com`
5. Click the "Allow" button.
6. Click the "Save Changes" button.

If you are smarter then me and know a programmatic way to fix this cookies issue, please open a github issue or a pull request.