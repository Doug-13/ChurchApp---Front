const MODE = 'online'; // 'local' | 'online'

export const API_BASE_URL =
  MODE === 'local'
    ? 'http://192.168.1.12:3000'
    // ? 'http://192.168.150.62:3000'
    : 'https://mylibrary-back-1.onrender.com';


    