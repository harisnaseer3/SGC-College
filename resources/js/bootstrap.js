import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;

// Add a request interceptor to globally attach per_page to GET requests
window.axios.interceptors.request.use(function (config) {
    if (config.method === 'get') {
        const perPage = localStorage.getItem('per_page');
        if (perPage) {
            config.params = config.params || {};
            if (!config.params.per_page) {
                config.params.per_page = perPage;
            }
        }
    }
    return config;
});
