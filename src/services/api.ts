// src/services/api.ts

import axios from "axios";
import auth from "@react-native-firebase/auth";

/**
 * URL oficial da API do ChurchApp.
 *
 * IMPORTANTE:
 * Para APK instalado em aparelho físico não devemos usar:
 *
 * http://localhost:3000
 * http://10.0.2.2:3000
 * http://192.168.x.x:3000
 * http://10.x.x.x:3000
 *
 * O aplicativo deve acessar o backend publicado no Render.
 */
export const API_BASE_URL = "https://churchapp-back.onrender.com";

/**
 * Instância principal do Axios.
 *
 * Todos os services que importarem `api` utilizarão
 * automaticamente o backend de produção.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,

  /**
   * 30 segundos.
   *
   * O Render pode precisar de alguns segundos para responder
   * quando o serviço estiver retomando após período de inatividade.
   */
  timeout: 30000,

  headers: {
    Accept: "application/json",
  },
});

/**
 * Interceptor responsável por colocar automaticamente
 * o Firebase ID Token nas requisições autenticadas.
 *
 * Firebase continua sendo usado para AUTENTICAÇÃO.
 *
 * O Firebase Storage não será mais utilizado.
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth().currentUser;

      if (user) {
        const token = await user.getIdToken();

        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    } catch (error) {
      console.error(
        "[API] Erro ao obter token de autenticação:",
        error
      );

      return config;
    }
  },
  (error) => {
    console.error(
      "[API] Erro ao preparar requisição:",
      error
    );

    return Promise.reject(error);
  }
);

/**
 * Interceptor de resposta.
 *
 * Não altera o conteúdo retornado pela API.
 * Serve principalmente para facilitar diagnóstico durante
 * o desenvolvimento.
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    if (__DEV__) {
      console.error(
        "[API] Erro na resposta:",
        {
          url: error?.config?.url,
          method: error?.config?.method,
          status: error?.response?.status,
          data: error?.response?.data,
          message: error?.message,
        }
      );
    }

    return Promise.reject(error);
  }
);

export default api;