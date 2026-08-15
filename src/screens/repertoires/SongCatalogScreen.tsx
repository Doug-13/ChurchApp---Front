import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, FAB, Icon, Searchbar, Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { songsService } from "../../services/songsService";
import type { Song } from "../../types/repertoire";

export default function SongCatalogScreen({ navigation }: any) {
  const auth: any = useAuth();
  const churchId = auth?.activeChurchId || auth?.currentChurch?.id || auth?.selectedChurch?.id;
  const canManage = !!auth?.permissions?.canManageSongCatalog;
  const [items, setItems] = useState<Song[]>([]); const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (term = q) => {
    if (!churchId) return;
    try { setItems(await songsService.list(churchId, term)); setError(""); }
    catch (e: any) { setError(e?.response?.data?.message || "Não foi possível carregar o catálogo."); }
  }, [churchId, q]);
  useEffect(() => { const timer = setTimeout(() => load(q).finally(() => setLoading(false)), 350); return () => clearTimeout(timer); }, [q, load]);
  const count = useMemo(() => `${items.length} ${items.length === 1 ? "música" : "músicas"}`, [items.length]);
  if (loading) return <View style={styles.center}><ActivityIndicator/><Text>Carregando catálogo...</Text></View>;
  return <View style={styles.root}>
    <FlatList data={items} keyExtractor={i => i.id} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{setRefreshing(true);await load();setRefreshing(false);}}/>}
      ListHeaderComponent={<View style={styles.header}><Text variant="headlineMedium" style={styles.title}>Catálogo de músicas</Text><Text style={styles.muted}>Todos podem ouvir, estudar e cantar juntos.</Text><Searchbar value={q} onChangeText={setQ} placeholder="Buscar por música ou artista" style={styles.search}/><Text style={styles.count}>{count}</Text>{!!error&&<Button onPress={()=>load()}>Tentar novamente</Button>}</View>}
      ListEmptyComponent={<View style={styles.center}><Icon source="music-note-off-outline" size={42}/><Text>Nenhuma música cadastrada.</Text></View>}
      renderItem={({item})=><Card mode="outlined" style={styles.card} onPress={()=>navigation.navigate("SongForm",{songId:item.id})}><Card.Content style={styles.row}><View style={styles.icon}><Icon source="music-note" size={22} color="#4158D0"/></View><View style={{flex:1}}><Text variant="titleMedium" style={{fontWeight:"800"}}>{item.title}</Text><Text style={styles.muted}>{item.artist || "Artista não informado"}{item.defaultTone ? ` • Tom ${item.defaultTone}` : ""}</Text><Text style={styles.uses}>{item._count?.repertoireSongs || 0} repertório(s)</Text></View><Icon source="chevron-right" size={22}/></Card.Content></Card>}/>
    {canManage&&<FAB icon="plus" label="Música" style={styles.fab} onPress={()=>navigation.navigate("SongForm")}/>} 
  </View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:"#F5F6FA"},content:{padding:16,paddingBottom:100,gap:10},header:{gap:8,marginBottom:8},title:{fontWeight:"900",color:"#1A2366"},muted:{color:"#7E86A8"},search:{marginTop:10,backgroundColor:"#fff"},count:{fontWeight:"800",color:"#4158D0"},card:{borderRadius:18,backgroundColor:"#fff"},row:{flexDirection:"row",alignItems:"center",gap:12},icon:{width:44,height:44,borderRadius:14,backgroundColor:"#EEF0FA",alignItems:"center",justifyContent:"center"},uses:{color:"#7C3AED",marginTop:4,fontSize:12},fab:{position:"absolute",right:18,bottom:18,backgroundColor:"#4158D0"},center:{flex:1,minHeight:180,alignItems:"center",justifyContent:"center",gap:10}});
