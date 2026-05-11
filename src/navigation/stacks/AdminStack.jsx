import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AdminDashboardScreen from "../../screens/admin/AdminDashboardScreen";
import MembersManageScreen from "../../screens/admin/MembersManageScreen";
import MemberFormScreen from "../../screens/admin/MemberFormScreen";
import MemberAdminDetailsScreen from "../../screens/admin/MemberAdminDetailsScreen";
import EventsManageScreen from "../../screens/admin/EventsManageScreen";
import CellsManageScreen from "../../screens/admin/CellsManageScreen";
import NewsComposerScreen from "../../screens/admin/NewsComposerScreen";
import ReportsScreen from "../../screens/admin/ReportsScreen";
import MinistriesManageScreen from "../../screens/admin/MinistriesManageScreen";
import MinistryFormScreen from "../../screens/admin/MinistryFormScreen";
import EventsCreateScreen from "../../screens/admin/EventsCreateScreen";
import EventsSelectMinistryScreen from "../../screens/admin/EventsSelectMinistryScreen";
import EventsSelectPeopleScreen from "../../screens/admin/EventsSelectPeopleScreen";
import EventsPreviewScreen from "../../screens/admin/EventsPreviewScreen";
import EventComposerScreen from "../../screens/admin/EventComposerScreen";
// import BirthdaysScreen from "../../screens/admin/MembersBirthdayScreen";

import CellCreateScreen from "../../screens/cells/CellCreateScreen";
import CellDetailsScreen from "../../screens/cells/CellDetailsScreen";
import CellMeetingScreen from "../../screens/cells/CellMeetingScreen";


const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: "Admin", headerShown: false, }} />
      <Stack.Screen name="MembersManage" component={MembersManageScreen} options={{ title: "Membros" }} />
      <Stack.Screen name="MemberAdminDetails" component={MemberAdminDetailsScreen} options={{ title: "Detalhes" }} />
      <Stack.Screen name="MemberForm" component={MemberFormScreen} options={{ title: "Cadastro" }} />
      <Stack.Screen name="EventsManageScreen" component={EventsManageScreen} options={{ title: "Eventos" }} />

      {/* ✅ você usa CellsManage por aqui */}
      <Stack.Screen name="CellsManage" component={CellsManageScreen} options={{ title: "Células" }} />

      {/* ✅ agora o AdminStack também conhece essas rotas */}
      <Stack.Screen name="CellCreate" component={CellCreateScreen} options={{ title: "Criar" }} />
      <Stack.Screen name="CellDetails" component={CellDetailsScreen} options={{ title: "Célula" }} />
      <Stack.Screen name="CellMeeting" component={CellMeetingScreen} options={{ title: "Encontro" }} />



      <Stack.Screen name="NewsComposer" component={NewsComposerScreen} options={{ title: "Publicar" }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: "Relatórios" }} />
      <Stack.Screen name="MinistriesManage" component={MinistriesManageScreen} options={{ title: "Ministérios" }} />
      <Stack.Screen name="MinistryForm" component={MinistryFormScreen} options={{ title: "Ministério" }} />
      <Stack.Screen name="EventComposerScreen" component={EventComposerScreen} options={{ title: "Evento" }} />
      <Stack.Screen name="EventsCreate" component={EventsCreateScreen} options={{ title: "Criar escala" }} />
      <Stack.Screen name="EventsSelectMinistry" component={EventsSelectMinistryScreen} options={{ title: "Ministério" }} />
      <Stack.Screen name="EventsSelectPeople" component={EventsSelectPeopleScreen} options={{ title: "Equipe" }} />
      <Stack.Screen name="EventsPreview" component={EventsPreviewScreen} options={{ title: "Prévia" }} />
      {/* <Stack.Screen name="Birthdays" component={BirthdaysScreen} options={{ title: "Aniversariantes" }} /> */}
    </Stack.Navigator>
  );
}