import auth from "@react-native-firebase/auth";

const BASE_URL = "http://192.168.1.7:3000";

export async function uploadFile(file: { uri: string; name: string; type: string }) {
  const token = await auth().currentUser?.getIdToken();
  if (!token) throw new Error("Not authenticated");

  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const res = await fetch(`${BASE_URL}/files/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // NÃO setar Content-Type manualmente aqui; o fetch monta boundary
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${res.status} ${txt}`);
  }

  return res.json() as Promise<{ path: string; url: string }>;
}
