export type RepertoireVisibility = "ALL" | "PRIVATE" | "MINISTRY";

export type RepertoireStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "CONFIRMED"
  | "ARCHIVED";

export type RepertoireSongStatus =
  | "CONFIRMED"
  | "STUDYING"
  | "REMOVED";

export type RepertoireSongLink = {
  id: string;
  songId: string;
  label?: string | null;
  url: string;
  createdAt?: string;
};

export type RepertoireSong = {
  id: string;
  repertoireId: string;
  songId?: string | null;
  order: number;
  title: string;
  artist?: string | null;
  tone?: string | null;
  notes?: string | null;
  leadMemberId?: string | null;
  status: RepertoireSongStatus;
  createdAt?: string;
  updatedAt?: string;
  links?: RepertoireSongLink[];
  song?: Song | null;
  leadMember?: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    phone?: string | null;
  } | null;
};

export type Repertoire = {
  id: string;
  churchId: string;
  title: string;
  description?: string | null;
  status: RepertoireStatus;
  visibility: RepertoireVisibility;
  ministryId?: string | null;
  eventId?: string | null;
  scheduleId?: string | null;
  createdById?: string | null;
  allowAssignedMembers: boolean;
  showInEventDetails: boolean;
  createdAt: string;
  updatedAt: string;
  songsCount?: number;

  ministry?: {
    id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
  } | null;

  event?: {
    id: string;
    title: string;
    dateLabel?: string;
    timeLabel?: string | null;
  } | null;

  schedule?: {
    id: string;
    title: string;
    date?: string;
  } | null;

  createdBy?: {
    id: string;
    name?: string | null;
    email?: string | null;
    photoUrl?: string | null;
  } | null;

  visibleToMinistries?: Array<{
    ministryId: string;
    repertoireId: string;
    ministry?: {
      id: string;
      name: string;
      color?: string | null;
    };
  }>;

  songs?: RepertoireSong[];
};

export type RepertoiresListResponse = {
  items: Repertoire[];
  nextCursor: string | null;
};

export type CreateRepertoireSongLinkPayload = {
  label?: string;
  url: string;
};

export type CreateRepertoireSongPayload = {
  songId?: string;
  order?: number;
  title: string;
  artist?: string;
  tone?: string;
  notes?: string;
  leadMemberId?: string;
  status?: RepertoireSongStatus;
  links?: CreateRepertoireSongLinkPayload[];
};

export type CreateRepertoirePayload = {
  title: string;
  description?: string;
  status?: RepertoireStatus;
  visibility?: RepertoireVisibility;
  ministryId?: string;
  eventId?: string;
  scheduleId?: string;
  allowAssignedMembers?: boolean;
  showInEventDetails?: boolean;
  ministryVisibilityIds?: string[];
  songs?: CreateRepertoireSongPayload[];
};

export type UpdateRepertoirePayload = Partial<CreateRepertoirePayload>;

export type UpdateRepertoireSongPayload =
  Partial<CreateRepertoireSongPayload>;

export type SongLink = { label?: string; url: string };
export type Song = {
  id: string; churchId: string; title: string; artist?: string | null;
  defaultTone?: string | null; lyrics?: string | null; chordChart?: string | null;
  notes?: string | null; links?: SongLink[]; active: boolean;
  createdAt: string; updatedAt: string; _count?: { repertoireSongs: number };
};
export type SaveSongPayload = Omit<Song, "id" | "churchId" | "active" | "createdAt" | "updatedAt" | "_count">;
