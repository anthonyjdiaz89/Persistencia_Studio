// Debugging script - Run this in browser console (F12)

// Get current characters from localStorage
const stored = localStorage.getItem('seedance_characters');
if (stored) {
  const chars = JSON.parse(stored);
  console.log('=== CHARACTERS IN LOCALSTORAGE ===');
  console.table(chars.map(c => ({
    name: c.name,
    id: c.id,
    hasAvatarUrl: !!c.avatarUrl,
    avatarUrl: c.avatarUrl ? c.avatarUrl.substring(0, 50) + '...' : 'MISSING'
  })));
} else {
  console.log('No characters in localStorage');
}

// Get user ID
const uid = localStorage.getItem('seedance_pseudo_uid');
console.log('\n=== USER ID ===');
console.log('User ID:', uid);

// Instructions
console.log('\n=== SOLUTION ===');
console.log('If avatarUrl is MISSING:');
console.log('1. Delete the characters and recreate them with images');
console.log('2. Or update Firestore manually to add avatarUrl field');
console.log('3. Or click "Materiales" tab and re-upload images for each character');
