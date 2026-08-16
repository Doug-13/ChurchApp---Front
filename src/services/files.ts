// src/services/files.ts

import auth from "@react-native-firebase/auth";

import { API_BASE_URL } from "./api";

/**
 * Arquivo enviado pelo React Native.
 */
export type UploadFileInput = {
  uri: string;
  name: string;
  type: string;
};

/**
 * Resposta atual do endpoint:
 *
 * POST /files/upload
 *
 * O backend envia o arquivo para o Cloudflare R2.
 */
export type UploadFileResponse = {
  path: string;
  key?: string;
  url: string;
  contentType?: string;
  size?: number;
};

/**
 * Normaliza o nome do arquivo.
 *
 * Alguns image pickers podem devolver arquivos sem nome.
 */
function normalizeFileName(
  file: UploadFileInput
): string {
  if (
    file.name &&
    typeof file.name === "string" &&
    file.name.trim()
  ) {
    return file.name.trim();
  }

  const extension = getExtensionFromMimeType(file.type);

  return `upload-${Date.now()}${extension}`;
}

/**
 * Retorna uma extensão baseada no MIME type.
 */
function getExtensionFromMimeType(
  mimeType?: string
): string {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";

    case "image/png":
      return ".png";

    case "image/webp":
      return ".webp";

    default:
      return "";
  }
}

/**
 * Normaliza MIME type.
 */
function normalizeMimeType(
  mimeType?: string
): string {
  if (
    mimeType &&
    typeof mimeType === "string" &&
    mimeType.trim()
  ) {
    return mimeType.trim().toLowerCase();
  }

  return "image/jpeg";
}

/**
 * Extrai uma mensagem legível da resposta do backend.
 */
async function readErrorResponse(
  response: Response
): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
      return "";
    }

    try {
      const json = JSON.parse(text);

      if (
        json &&
        typeof json === "object"
      ) {
        if (Array.isArray(json.message)) {
          return json.message.join(", ");
        }

        if (json.message) {
          return String(json.message);
        }

        if (json.error) {
          return String(json.error);
        }
      }
    } catch {
      // Não era JSON.
    }

    return text;
  } catch {
    return "";
  }
}

/**
 * Realiza upload de arquivo para o backend do ChurchApp.
 *
 * Fluxo:
 *
 * React Native
 *      ↓
 * Firebase Auth
 *      ↓ token
 * POST /files/upload
 *      ↓
 * ChurchApp Backend / Render
 *      ↓
 * Cloudflare R2
 *
 * IMPORTANTE:
 *
 * O aplicativo NÃO possui:
 *
 * R2_ACCOUNT_ID
 * R2_ACCESS_KEY_ID
 * R2_SECRET_ACCESS_KEY
 *
 * Essas credenciais ficam exclusivamente no backend.
 */
export async function uploadFile(
  file: UploadFileInput
): Promise<UploadFileResponse> {
  if (!file) {
    throw new Error(
      "Nenhum arquivo foi selecionado."
    );
  }

  if (!file.uri) {
    throw new Error(
      "O arquivo selecionado não possui uma URI válida."
    );
  }

  const user = auth().currentUser;

  if (!user) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  /**
   * Obtém um token Firebase válido.
   *
   * O Firebase continua responsável pela autenticação,
   * mas não pelo armazenamento de arquivos.
   */
  const token = await user.getIdToken();

  if (!token) {
    throw new Error(
      "Não foi possível obter o token de autenticação."
    );
  }

  const fileName = normalizeFileName(file);
  const mimeType = normalizeMimeType(file.type);

  const formData = new FormData();

  formData.append(
    "file",
    {
      uri: file.uri,
      name: fileName,
      type: mimeType,
    } as any
  );

  const uploadUrl =
    `${API_BASE_URL}/files/upload`;

  if (__DEV__) {
    console.log(
      "[R2] Iniciando upload:",
      {
        url: uploadUrl,
        fileName,
        mimeType,
        uri: file.uri,
      }
    );
  }

  let response: Response;

  try {
    response = await fetch(
      uploadUrl,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",

          /**
           * NÃO adicionar:
           *
           * "Content-Type": "multipart/form-data"
           *
           * O próprio React Native/fetch precisa criar
           * automaticamente o boundary do multipart.
           */
        },

        body: formData,
      }
    );
  } catch (error: any) {
    console.error(
      "[R2] Erro de conexão durante upload:",
      error
    );

    throw new Error(
      error?.message ||
        "Não foi possível conectar ao servidor para enviar o arquivo."
    );
  }

  if (!response.ok) {
    const serverMessage =
      await readErrorResponse(response);

    console.error(
      "[R2] Upload recusado pelo servidor:",
      {
        status: response.status,
        message: serverMessage,
      }
    );

    throw new Error(
      serverMessage
        ? `Erro ao enviar arquivo: ${serverMessage}`
        : `Erro ao enviar arquivo. HTTP ${response.status}.`
    );
  }

  let data: UploadFileResponse;

  try {
    data =
      (await response.json()) as UploadFileResponse;
  } catch {
    throw new Error(
      "O servidor enviou uma resposta inválida após o upload."
    );
  }

  if (!data) {
    throw new Error(
      "O servidor não retornou os dados do arquivo."
    );
  }

  /**
   * O backend deve retornar pelo menos:
   *
   * {
   *   path: "...",
   *   url: "..."
   * }
   */
  if (!data.path && !data.key) {
    console.warn(
      "[R2] O backend não retornou path/key:",
      data
    );
  }

  if (__DEV__) {
    console.log(
      "[R2] Upload concluído:",
      {
        path: data.path,
        key: data.key,
        contentType: data.contentType,
        size: data.size,
      }
    );
  }

  return data;
}

/**
 * Obtém uma nova URL temporária para um objeto
 * que já está armazenado no bucket privado do R2.
 *
 * O backend possui:
 *
 * GET /files/url?key=...
 */
export async function getFileUrl(
  key: string
): Promise<string> {
  if (!key) {
    throw new Error(
      "A chave do arquivo não foi informada."
    );
  }

  const user = auth().currentUser;

  if (!user) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  const token = await user.getIdToken();

  const endpoint =
    `${API_BASE_URL}/files/url?key=${encodeURIComponent(
      key
    )}`;

  const response = await fetch(
    endpoint,
    {
      method: "GET",

      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const serverMessage =
      await readErrorResponse(response);

    throw new Error(
      serverMessage
        ? `Erro ao obter arquivo: ${serverMessage}`
        : `Erro ao obter arquivo. HTTP ${response.status}.`
    );
  }

  const data = await response.json();

  if (!data?.url) {
    throw new Error(
      "O servidor não retornou a URL do arquivo."
    );
  }

  return data.url;
}

/**
 * Verifica se determinado objeto existe no R2.
 */
export async function fileExists(
  key: string
): Promise<boolean> {
  if (!key) {
    return false;
  }

  const user = auth().currentUser;

  if (!user) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  const token = await user.getIdToken();

  const endpoint =
    `${API_BASE_URL}/files/exists?key=${encodeURIComponent(
      key
    )}`;

  const response = await fetch(
    endpoint,
    {
      method: "GET",

      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const serverMessage =
      await readErrorResponse(response);

    throw new Error(
      serverMessage
        ? `Erro ao verificar arquivo: ${serverMessage}`
        : `Erro ao verificar arquivo. HTTP ${response.status}.`
    );
  }

  const data = await response.json();

  return Boolean(data?.exists);
}

/**
 * Exclui objeto armazenado no Cloudflare R2.
 */
export async function deleteFile(
  key: string
): Promise<void> {
  if (!key) {
    throw new Error(
      "A chave do arquivo não foi informada."
    );
  }

  const user = auth().currentUser;

  if (!user) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  const token = await user.getIdToken();

  const encodedKey =
    encodeURIComponent(key);

  const endpoint =
    `${API_BASE_URL}/files/${encodedKey}`;

  const response = await fetch(
    endpoint,
    {
      method: "DELETE",

      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const serverMessage =
      await readErrorResponse(response);

    throw new Error(
      serverMessage
        ? `Erro ao excluir arquivo: ${serverMessage}`
        : `Erro ao excluir arquivo. HTTP ${response.status}.`
    );
  }

  if (__DEV__) {
    console.log(
      "[R2] Arquivo excluído:",
      key
    );
  }
}