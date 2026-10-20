const token = localStorage.getItem('token');

function api(url, method, body) {
  return fetch(url, {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined
  }).then(function (res) {
    if (res.status === 401) logout();
    return res.json();
  });
}

function logout() {
  localStorage.clear();
  location.href = 'index.html';
}

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function today() {
  return new Date().toLocaleDateString('en-CA');
}

function showNav() {
  if (!token) {
    location.href = 'index.html';
    return;
  }
  let html = '<span class="logo">FC-1 Review Board</span><a href="home.html">Menu</a><a href="stats.html">Stats</a>';
  if (localStorage.getItem('role') === 'admin') html += '<a href="admin.html">Admin</a>';
  html += '<a href="#" onclick="logout()">Logout (' + esc(localStorage.getItem('name')) + ')</a>';
  document.getElementById('nav').innerHTML = html;
}
