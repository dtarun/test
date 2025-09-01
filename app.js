// This script runs in the user's browser, not on the server.

document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/version')
      .then(response => response.json())
      .then(data => {
        const versionElement = document.getElementById('app-version');
        if (versionElement && data.version) {
          versionElement.textContent = `v${data.version}`;
        }
      })
      .catch(error => console.error('Error fetching version:', error));
  });
  
  