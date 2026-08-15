import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text, TextInput } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { songsService } from "../../services/songsService";

export default function SongFormScreen({navigation,route}:any){
 const auth:any=useAuth(); const churchId=auth?.activeChurchId||auth?.currentChurch?.id||auth?.selectedChurch?.id;
 const id=route?.params?.songId; const editing=!!id; const [loading,setLoading]=useState(editing); const [saving,setSaving]=useState(false);
 const [title,setTitle]=useState(""); const [artist,setArtist]=useState(""); const [tone,setTone]=useState(""); const [lyrics,setLyrics]=useState(""); const [chords,setChords]=useState(""); const [notes,setNotes]=useState(""); const [url,setUrl]=useState("");
 const canManage=useMemo(()=>!!auth?.permissions?.canManageSongCatalog,[auth]);
 useEffect(()=>{if(!editing||!churchId)return setLoading(false);songsService.getOne(churchId,id).then(s=>{setTitle(s.title);setArtist(s.artist||"");setTone(s.defaultTone||"");setLyrics(s.lyrics||"");setChords(s.chordChart||"");setNotes(s.notes||"");setUrl(s.links?.[0]?.url||"");}).catch(()=>Alert.alert("Erro","Não foi possível carregar a música.")).finally(()=>setLoading(false));},[churchId,id,editing]);
 async function save(){if(!title.trim())return Alert.alert("Campo obrigatório","Informe o título.");if(url&& !/^https?:\/\//i.test(url))return Alert.alert("Link inválido","Use http:// ou https://.");try{setSaving(true);const payload={title:title.trim(),artist:artist.trim()||undefined,defaultTone:tone.trim()||undefined,lyrics:lyrics.trim()||undefined,chordChart:chords.trim()||undefined,notes:notes.trim()||undefined,links:url.trim()?[{label:"Ouvir",url:url.trim()}]:[]};if(editing)await songsService.update(churchId,id,payload);else await songsService.create(churchId,payload);navigation.goBack();}catch(e:any){Alert.alert("Erro",e?.response?.data?.message||"Não foi possível salvar.");}finally{setSaving(false);}}
 if(loading)return <View style={styles.center}><ActivityIndicator/></View>;
 if(!canManage)return <View style={styles.center}><Text>Você não possui permissão para gerenciar o catálogo.</Text></View>;
 return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text variant="headlineSmall" style={styles.title}>{editing?"Editar música":"Nova música"}</Text>
 {[{l:"Título *",v:title,s:setTitle},{l:"Artista",v:artist,s:setArtist},{l:"Tom padrão",v:tone,s:setTone},{l:"Link para ouvir",v:url,s:setUrl}].map(x=><TextInput key={x.l} label={x.l} value={x.v} onChangeText={x.s} mode="outlined"/>)}
 <TextInput label="Letra" value={lyrics} onChangeText={setLyrics} mode="outlined" multiline numberOfLines={8}/><TextInput label="Cifra" value={chords} onChangeText={setChords} mode="outlined" multiline numberOfLines={8}/><TextInput label="Observações" value={notes} onChangeText={setNotes} mode="outlined" multiline numberOfLines={4}/><Button mode="contained" loading={saving} disabled={saving} onPress={save}>Salvar música</Button>
 {editing&&<Button textColor="#E84D4D" onPress={()=>Alert.alert("Arquivar música","Ela deixará o catálogo, mas permanecerá nos repertórios existentes.",[{text:"Cancelar",style:"cancel"},{text:"Arquivar",style:"destructive",onPress:async()=>{await songsService.archive(churchId,id);navigation.goBack();}}])}>Arquivar</Button>}</ScrollView>;
}
const styles=StyleSheet.create({content:{padding:18,gap:14,backgroundColor:"#F5F6FA",flexGrow:1},title:{fontWeight:"900",color:"#1A2366"},center:{flex:1,alignItems:"center",justifyContent:"center",padding:24}});
