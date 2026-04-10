import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Icon,
  List,
  Text,
  useTheme,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";

function Pill({ icon, label }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.colors.primaryContainer }]}>
      <Icon source={icon} size={16} color={theme.colors.primary} />
      <Text style={{ color: theme.colors.primary, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

export default function MoreScreen({ navigation }) {
  const theme = useTheme();
  const { user, isAdmin, signOut } = useAuth();

  const name = user?.displayName || "Conta";
  const email = user?.email || "—";

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Card
          mode="outlined"
          style={[styles.headerCard, { borderColor: theme.colors.outlineVariant }]}
        >
          <Card.Content style={styles.headerContent}>
            <View style={styles.headerTop}>
              <Avatar.Icon
                size={56}
                icon="account"
                style={{ backgroundColor: theme.colors.primaryContainer }}
                color={theme.colors.primary}
              />

              <View style={{ flex: 1 }}>
                <Text variant="titleLarge" style={{ fontWeight: "900" }} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                  {email}
                </Text>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <Pill icon="account-outline" label={isAdmin ? "Administrador" : "Membro"} />
                  <Pill icon="church" label="Minha igreja" />
                </View>
              </View>

              <Button
                mode="text"
                onPress={() => navigation.navigate("Profile")}
                icon="chevron-right"
                contentStyle={{ flexDirection: "row-reverse" }}
              >
                Perfil
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Conta */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Conta
        </Text>
        <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
          <List.Item
            title="Meu Perfil"
            description="Dados pessoais e preferências"
            left={(p) => <List.Icon {...p} icon="account-outline" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => navigation.navigate("Profile")}
          />
          <Divider />
          <List.Item
            title="Configurações"
            description="Notificações, privacidade e tema"
            left={(p) => <List.Icon {...p} icon="cog-outline" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => navigation.navigate("Settings")}
          />
        </Card>

        {/* Administração */}
        {isAdmin ? (
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Administração
            </Text>

            <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
              <List.Item
                title="Painel administrativo"
                description="Dashboard, cadastros e permissões"
                left={(p) => <List.Icon {...p} icon="shield-outline" />}
                right={(p) => <List.Icon {...p} icon="chevron-right" />}
                onPress={() => navigation.navigate("Admin")}
              />
              <Divider />
              <List.Item
                title="Gerenciar membros"
                description="Cadastrar, editar e permissões"
                left={(p) => <List.Icon {...p} icon="account-group-outline" />}
                right={(p) => <List.Icon {...p} icon="chevron-right" />}
                onPress={() => navigation.navigate("Directory")}
              />
            </Card>
          </>
        ) : null}

        {/* Ajuda */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Ajuda
        </Text>

        <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
          <List.Item
            title="Suporte"
            description="Fale com a administração"
            left={(p) => <List.Icon {...p} icon="lifebuoy" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => navigation.navigate("Support")}
          />
          <Divider />
          <List.Item
            title="Sobre o app"
            description="Versão, termos e privacidade"
            left={(p) => <List.Icon {...p} icon="information-outline" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => navigation.navigate("About")}
          />
        </Card>

        {/* Sair */}
        <View style={{ marginTop: 14 }}>

          <Button
            icon="logout"
            mode="text"
            onPress={signOut}
            style={{ marginTop: 12 }}
          >
            Sair e entrar com outra conta
          </Button>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, paddingBottom: 28 },

  headerCard: { borderRadius: 22 },
  headerContent: { paddingVertical: 6 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  sectionTitle: { marginTop: 16, marginBottom: 10, fontWeight: "800" },
  card: { borderRadius: 18 },
});
