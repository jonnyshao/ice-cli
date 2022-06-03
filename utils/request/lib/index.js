'use strict';

const axios = require('axios');

const BASE_URL = process.env.ICE_CLI_BASE_URL
  ? rocess.env.ICE_CLI_BASE_URL
  : 'http://localhost:7002';

const request = axios.create({
  baseURL: BASE_URL,
});

request.interceptors.response.use((response) => {
  if (response.status == 200) return response.data;
}, Promise.reject);

module.exports = request;
