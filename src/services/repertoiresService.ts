import { api } from "./api";
import type {
  CreateRepertoirePayload,
  CreateRepertoireSongLinkPayload,
  CreateRepertoireSongPayload,
  Repertoire,
  RepertoiresListResponse,
  UpdateRepertoirePayload,
  UpdateRepertoireSongPayload,
} from "../types/repertoire";

type ListRepertoiresParams = {
  q?: string;
  ministryId?: string;
  eventId?: string;
  scheduleId?: string;
  take?: number;
  cursor?: string;
};

function cleanParams(params?: Record<string, unknown>) {
  const result: Record<string, unknown> = {};

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  });

  return result;
}

export const repertoiresService = {
  async list(churchId: string, params?: ListRepertoiresParams) {
    const response = await api.get<RepertoiresListResponse>(
      `/churches/${churchId}/repertoires`,
      {
        params: cleanParams(params),
      },
    );

    return response.data;
  },

  async getOne(churchId: string, repertoireId: string) {
    const response = await api.get<Repertoire>(
      `/churches/${churchId}/repertoires/${repertoireId}`,
    );

    return response.data;
  },

  async create(churchId: string, payload: CreateRepertoirePayload) {
    const response = await api.post<Repertoire>(
      `/churches/${churchId}/repertoires`,
      payload,
    );

    return response.data;
  },

  async update(
    churchId: string,
    repertoireId: string,
    payload: UpdateRepertoirePayload,
  ) {
    const response = await api.patch<Repertoire>(
      `/churches/${churchId}/repertoires/${repertoireId}`,
      payload,
    );

    return response.data;
  },

  async remove(churchId: string, repertoireId: string) {
    const response = await api.delete<{ ok: boolean }>(
      `/churches/${churchId}/repertoires/${repertoireId}`,
    );

    return response.data;
  },

  async addSong(
    churchId: string,
    repertoireId: string,
    payload: CreateRepertoireSongPayload,
  ) {
    const response = await api.post(
      `/churches/${churchId}/repertoires/${repertoireId}/songs`,
      payload,
    );

    return response.data;
  },

  async updateSong(
    churchId: string,
    repertoireId: string,
    songId: string,
    payload: UpdateRepertoireSongPayload,
  ) {
    const response = await api.patch(
      `/churches/${churchId}/repertoires/${repertoireId}/songs/${songId}`,
      payload,
    );

    return response.data;
  },

  async removeSong(
    churchId: string,
    repertoireId: string,
    songId: string,
  ) {
    const response = await api.delete<{ ok: boolean }>(
      `/churches/${churchId}/repertoires/${repertoireId}/songs/${songId}`,
    );

    return response.data;
  },

  async addSongLink(
    churchId: string,
    repertoireId: string,
    songId: string,
    payload: CreateRepertoireSongLinkPayload,
  ) {
    const response = await api.post(
      `/churches/${churchId}/repertoires/${repertoireId}/songs/${songId}/links`,
      payload,
    );

    return response.data;
  },

  async removeSongLink(
    churchId: string,
    repertoireId: string,
    songId: string,
    linkId: string,
  ) {
    const response = await api.delete<{ ok: boolean }>(
      `/churches/${churchId}/repertoires/${repertoireId}/songs/${songId}/links/${linkId}`,
    );

    return response.data;
  },
};