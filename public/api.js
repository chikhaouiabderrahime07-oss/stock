/* ============================================================
   API.JS — Frontend API Client for ERP Douroub v6
   Replaces localStorage with REST API calls to MongoDB backend
   ============================================================ */

window.API = {
  baseUrl: '',

  getToken() {
    return localStorage.getItem('erp_jwt_token') || '';
  },

  setToken(token) {
    localStorage.setItem('erp_jwt_token', token);
  },

  clearToken() {
    localStorage.removeItem('erp_jwt_token');
  },

  async request(method, path, body = null, options = {}) {
    const url = this.baseUrl + path;
    const headers = {
      'Authorization': 'Bearer ' + this.getToken()
    };

    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      method,
      headers,
      ...options
    };

    if (body) {
      config.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    const res = await fetch(url, config);

    if (res.status === 401) {
      this.clearToken();
      if (window.Auth && window.Auth.logout) {
        window.Auth.logout();
      }
      throw new Error('Session expirée, veuillez vous reconnecter');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.error || 'Erreur serveur');
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

  // ─── Auth ──────────────────────────────────────────────
  auth: {
    async login(username, password) {
      const res = await fetch(`${API.BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Identifiants incorrects');
      }
      API.setToken(data.token);
      return data;
    },
    async me() {
      return API.get('/api/auth/me');
    },
    async register(userData) {
      return API.post('/api/auth/register', userData);
    },
    async changePassword(currentPassword, newPassword) {
      return API.put('/api/auth/password', { currentPassword, newPassword });
    },
    async getUsers() {
      return API.get('/api/auth/users');
    },
    async updateUser(id, userData) {
      return API.put('/api/auth/users/' + id, userData);
    },
    async deleteUser(id) {
      return API.del('/api/auth/users/' + id);
    }
  },

  // ─── Articles ──────────────────────────────────────────
  articles: {
    async getAll(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return API.get('/api/articles' + (qs ? '?' + qs : ''));
    },
    async getById(id) {
      return API.get('/api/articles/' + id);
    },
    async create(article) {
      return API.post('/api/articles', article);
    },
    async update(id, article) {
      return API.put('/api/articles/' + id, article);
    },
    async remove(id) {
      return API.del('/api/articles/' + id);
    },
    async bulkCreate(articles) {
      return API.post('/api/articles/bulk', { articles });
    },
    async adjustStock(id, type, quantity, reason, reference) {
      return API.post('/api/articles/' + id + '/stock', { type, quantity, reason, reference });
    }
  },

  // ─── Orders ────────────────────────────────────────────
  orders: {
    async getAll(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return API.get('/api/orders' + (qs ? '?' + qs : ''));
    },
    async getById(id) {
      return API.get('/api/orders/' + id);
    },
    async create(order) {
      return API.post('/api/orders', order);
    },
    async update(id, order) {
      return API.put('/api/orders/' + id, order);
    },
    async remove(id) {
      return API.del('/api/orders/' + id);
    }
  },

  // ─── Decharges ─────────────────────────────────────────
  decharges: {
    async getAll(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return API.get('/api/decharges' + (qs ? '?' + qs : ''));
    },
    async getById(id) {
      return API.get('/api/decharges/' + id);
    },
    async create(decharge) {
      return API.post('/api/decharges', decharge);
    },
    async update(id, decharge) {
      return API.put('/api/decharges/' + id, decharge);
    },
    async remove(id) {
      return API.del('/api/decharges/' + id);
    }
  },

  // ─── Fleet ─────────────────────────────────────────────
  fleet: {
    async getAll(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return API.get('/api/fleet' + (qs ? '?' + qs : ''));
    },
    async getById(id) {
      return API.get('/api/fleet/' + id);
    },
    async create(vehicle) {
      return API.post('/api/fleet', vehicle);
    },
    async update(id, vehicle) {
      return API.put('/api/fleet/' + id, vehicle);
    },
    async remove(id) {
      return API.del('/api/fleet/' + id);
    }
  },

  // ─── Citernes ──────────────────────────────────────────
  citernes: {
    async getAll() {
      return API.get('/api/citernes');
    },
    async getById(id) {
      return API.get('/api/citernes/' + id);
    },
    async create(citerne) {
      return API.post('/api/citernes', citerne);
    },
    async update(id, citerne) {
      return API.put('/api/citernes/' + id, citerne);
    },
    async addDelivery(id, delivery) {
      return API.post('/api/citernes/' + id + '/delivery', delivery);
    },
    async addDistribution(id, distribution) {
      return API.post('/api/citernes/' + id + '/distribution', distribution);
    },
    async remove(id) {
      return API.del('/api/citernes/' + id);
    }
  },

  // ─── Bons de Travail ──────────────────────────────────
  bt: {
    async getAll(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return API.get('/api/bt' + (qs ? '?' + qs : ''));
    },
    async getById(id) {
      return API.get('/api/bt/' + id);
    },
    async create(bon) {
      return API.post('/api/bt', bon);
    },
    async update(id, bon) {
      return API.put('/api/bt/' + id, bon);
    },
    async close(id, data) {
      return API.put('/api/bt/' + id + '/close', data);
    },
    async remove(id) {
      return API.del('/api/bt/' + id);
    }
  },

  // ─── Settings ──────────────────────────────────────────
  settings: {
    async get() {
      return API.get('/api/settings');
    },
    async update(settings) {
      return API.put('/api/settings', settings);
    },
    async uploadLogo(position, imageBase64) {
      return API.put('/api/settings/logo/' + position, { image: imageBase64 });
    },
    async deleteLogo(position) {
      return API.del('/api/settings/logo/' + position);
    }
  },

  // ─── Movements ─────────────────────────────────────────
  movements: {
    async getAll(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return API.get('/api/movements' + (qs ? '?' + qs : ''));
    }
  },

  // ─── Upload ────────────────────────────────────────────
  upload: {
    async articleImage(articleId, file) {
      const formData = new FormData();
      formData.append('image', file);
      return API.request('POST', '/api/upload/article-image/' + articleId, formData);
    },
    async articleImageBase64(articleId, base64) {
      return API.post('/api/upload/article-image-base64/' + articleId, { image: base64 });
    },
    async deleteArticleImage(articleId) {
      return API.del('/api/upload/article-image/' + articleId);
    }
  },

  // ─── Backup ────────────────────────────────────────────
  backup: {
    async list() {
      return API.get('/api/backup');
    },
    async trigger() {
      return API.post('/api/backup', {});
    },
    async download(id) {
      return API.get('/api/backup/' + id);
    },
    async remove(id) {
      return API.del('/api/backup/' + id);
    }
  },

  // ─── SSE (Server-Sent Events for real-time updates) ───
  sse: {
    connection: null,
    listeners: [],

    connect() {
      if (this.connection) return;
      if (!API.getToken()) return;

      this.connection = new EventSource('/api/events');

      this.connection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach(fn => {
            try { fn(data); } catch(e) { console.error('[SSE] Listener error:', e); }
          });
        } catch(e) {
          console.error('[SSE] Parse error:', e);
        }
      };

      this.connection.onerror = () => {
        console.warn('[SSE] Connection lost, reconnecting in 5s...');
        this.disconnect();
        setTimeout(() => this.connect(), 5000);
      };
    },

    disconnect() {
      if (this.connection) {
        this.connection.close();
        this.connection = null;
      }
    },

    onUpdate(fn) {
      this.listeners.push(fn);
    },

    offUpdate(fn) {
      this.listeners = this.listeners.filter(l => l !== fn);
    }
  }
};
