import { api } from "./api";
import type { SaveSongPayload, Song } from "../types/repertoire";
export const songsService = {
  async list(churchId: string, q = "") { return (await api.get<Song[]>(`/churches/${churchId}/songs`, { params: q ? { q } : {} })).data; },
  async getOne(churchId: string, id: string) { return (await api.get<Song>(`/churches/${churchId}/songs/${id}`)).data; },
  async create(churchId: string, payload: SaveSongPayload) { return (await api.post<Song>(`/churches/${churchId}/songs`, payload)).data; },
  async update(churchId: string, id: string, payload: Partial<SaveSongPayload>) { return (await api.patch<Song>(`/churches/${churchId}/songs/${id}`, payload)).data; },
  async archive(churchId: string, id: string) { return (await api.delete<{ok:boolean}>(`/churches/${churchId}/songs/${id}`)).data; },
};
