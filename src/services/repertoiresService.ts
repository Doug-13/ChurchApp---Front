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

function normalizeListResponse(
  data:
    | RepertoiresListResponse
    | Repertoire[]
    | {
        items?: Repertoire[];
        repertoires?: Repertoire[];
        list?: Repertoire[];
        nextCursor?: string | null;
      }
    | null
    | undefined,
): RepertoiresListResponse {
  if (Array.isArray(data)) {
    return {
      items: data,
      nextCursor: null,
    };
  }

  if (!data || typeof data !== "object") {
    return {
      items: [],
      nextCursor: null,
    };
  }

  const response = data as {
    items?: Repertoire[];
    repertoires?: Repertoire[];
    list?: Repertoire[];
    nextCursor?: string | null;
  };

  const items = Array.isArray(response.items)
    ? response.items
    : Array.isArray(response.repertoires)
      ? response.repertoires
      : Array.isArray(response.list)
        ? response.list
        : [];

  return {
    items,
    nextCursor: response.nextCursor ?? null,
  };
}

export const repertoiresService = {
  async list(
    churchId: string,
    params?: ListRepertoiresParams,
  ): Promise<RepertoiresListResponse> {
    const response = await api.get<
      RepertoiresListResponse | Repertoire[]
    >(
      `/churches/${encodeURIComponent(churchId)}/repertoires`,
      {
        params: cleanParams(params),
      },
    );

    return normalizeListResponse(response.data);
  },

  async getOne(
    churchId: string,
    repertoireId: string,
  ): Promise<Repertoire> {
    const response = await api.get<Repertoire>(
      `/churches/${encodeURIComponent(
        churchId,
      )}/repertoires/${encodeURIComponent(repertoireId)}`,
    );

    return response.data;
  },

  async create(
    churchId: string,
    payload: CreateRepertoirePayload,
  ): Promise<Repertoire> {
    const response = await api.post<Repertoire>(
      `/churches/${encodeURIComponent(churchId)}/repertoires`,
      payload,
    );

    return response.data;
  },

  async update(
    churchId: string,
    repertoireId: string,
    payload: UpdateRepertoirePayload,
  ): Promise<Repertoire> {
    const response = await api.patch<Repertoire>(
      `/churches/${encodeURIComponent(
        churchId,
      )}/repertoires/${encodeURIComponent(repertoireId)}`,
      payload,
    );

    return response.data;
  },

  async remove(
    churchId: string,
    repertoireId: string,
  ): Promise<{ ok: boolean }> {
    const response = await api.delete<{ ok: boolean }>(
      `/churches/${encodeURIComponent(
        churchId,
      )}/repertoires/${encodeURIComponent(repertoireId)}`,
    );

    return response.data;
  },

  async addSong(
    churchId: string,
    repertoireId: string,
    payload: CreateRepertoireSongPayload,
  ) {
    const response = await api.post(
      `/churches/${encodeURIComponent(
        churchId,
      )}/repertoires/${encodeURIComponent(repertoireId)}/songs`,
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
      `/churches/${encodeURIComponent(
        churchId,
      )}/repertoires/${encodeURIComponent(
        repertoireId,
      )}/songs/${encodeURIComponent(songId)}`,
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
      `/churches/${encodeURIComponent(
        churchId,
      )}/repertoires/${encodeURIComponent(
        repertoireId,
      )}/songs/${encodeURIComponent(songId)}`,
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
      `/churches/${encodeURIComponent(
        churchId,
      )}/repertoires/${encodeURIComponent(
        repertoireId,
      )}/songs/${encodeURIComponent(songId)}/links`,
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
      `/churches/${encodeURIComponent(
        churchId,
      )}/repertoires/${encodeURIComponent(
        repertoireId,
      )}/songs/${encodeURIComponent(
        songId,
      )}/links/${encodeURIComponent(linkId)}`,
    );

    return response.data;
  },
};

export default repertoiresService;