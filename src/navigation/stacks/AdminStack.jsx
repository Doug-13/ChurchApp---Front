// src/navigation/stacks/AdminStack.jsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useTerms } from "../../context/TerminologyContext";

import AdminDashboardScreen from "../../screens/admin/AdminDashboardScreen";
import MembersManageScreen from "../../screens/admin/MembersManageScreen";
import MemberFormScreen from "../../screens/admin/MemberFormScreen";
import MemberAdminDetailsScreen from "../../screens/admin/MemberAdminDetailsScreen";
import MemberPermissionsScreen from "../../screens/admin/MemberPermissionsScreen";

import EventsManageScreen from "../../screens/admin/EventsManageScreen";
import EventsCreateScreen from "../../screens/admin/EventsCreateScreen";
import EventsSelectMinistryScreen from "../../screens/admin/EventsSelectMinistryScreen";
import EventsSelectPeopleScreen from "../../screens/admin/EventsSelectPeopleScreen";
import EventsPreviewScreen from "../../screens/admin/EventsPreviewScreen";
import EventComposerScreen from "../../screens/admin/EventComposerScreen";

import CellsManageScreen from "../../screens/admin/CellsManageScreen";
import NewsComposerScreen from "../../screens/admin/NewsComposerScreen";
import ReportsScreen from "../../screens/admin/ReportsScreen";
import MinistriesManageScreen from "../../screens/admin/MinistriesManageScreen";
import MinistryFormScreen from "../../screens/admin/MinistryFormScreen";
import BirthdaysScreen from "../../screens/admin/MembersBirthdayScreen";
import TerminologyScreen from "../../screens/admin/TerminologyScreen";

import CellCreateScreen from "../../screens/cells/CellCreateScreen";
import CellDetailsScreen from "../../screens/cells/CellDetailsScreen";
import CellMeetingScreen from "../../screens/cells/CellMeetingScreen";

import ChurchProfile from "../../screens/church/ChurchProfile";

import RepertoiresStack from "./RepertoiresStack";

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  const { t } = useTerms();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: "Admin",
          headerShown: false,
        }}
      />

      {/* ── Membros ─────────────────────────────────────────────────── */}

      <Stack.Screen
        name="MembersManage"
        component={MembersManageScreen}
        options={{
          title: `${t.member}s`,
        }}
      />

      <Stack.Screen
        name="MemberAdminDetails"
        component={MemberAdminDetailsScreen}
        options={{
          title: `Detalhes do ${t.member}`,
        }}
      />

      <Stack.Screen
        name="MemberPermissions"
        component={MemberPermissionsScreen}
        options={{
          title: "Permissões",
        }}
      />

      <Stack.Screen
        name="MemberForm"
        component={MemberFormScreen}
        options={{
          title: `Cadastro de ${t.member}`,
        }}
      />

      {/* ── Eventos ─────────────────────────────────────────────────── */}

      <Stack.Screen
        name="EventsManageScreen"
        component={EventsManageScreen}
        options={{
          title: "Eventos",
        }}
      />

      <Stack.Screen
        name="EventComposerScreen"
        component={EventComposerScreen}
        options={{
          title: "Evento",
        }}
      />

      <Stack.Screen
        name="EventsCreate"
        component={EventsCreateScreen}
        options={{
          title: `Criar ${t.schedule}`,
        }}
      />

      <Stack.Screen
        name="EventsSelectMinistry"
        component={EventsSelectMinistryScreen}
        options={{
          title: t.ministry,
        }}
      />

      <Stack.Screen
        name="EventsSelectPeople"
        component={EventsSelectPeopleScreen}
        options={{
          title: "Equipe",
        }}
      />

      <Stack.Screen
        name="EventsPreview"
        component={EventsPreviewScreen}
        options={{
          title: "Prévia",
        }}
      />

      {/* ── Células ─────────────────────────────────────────────────── */}

      <Stack.Screen
        name="CellsManage"
        component={CellsManageScreen}
        options={{
          title: t.cell,
        }}
      />

      <Stack.Screen
        name="CellCreate"
        component={CellCreateScreen}
        options={{
          title: `Nova ${t.cell}`,
        }}
      />

      <Stack.Screen
        name="CellDetails"
        component={CellDetailsScreen}
        options={{
          title: t.cell,
        }}
      />

      <Stack.Screen
        name="CellMeeting"
        component={CellMeetingScreen}
        options={{
          title: t.cellMeeting,
        }}
      />

      {/* ── Avisos ──────────────────────────────────────────────────── */}

      <Stack.Screen
        name="NewsComposer"
        component={NewsComposerScreen}
        options={{
          title: `Publicar ${t.news}`,
        }}
      />

      {/* ── Ministérios ─────────────────────────────────────────────── */}

      <Stack.Screen
        name="MinistriesManage"
        component={MinistriesManageScreen}
        options={{
          title: `${t.ministry}s`,
        }}
      />

      <Stack.Screen
        name="MinistryForm"
        component={MinistryFormScreen}
        options={{
          title: t.ministry,
        }}
      />

      {/* ── Repertórios ─────────────────────────────────────────────── */}

      <Stack.Screen
        name="Repertoires"
        component={RepertoiresStack}
        options={{
          title: "Repertórios",
          headerShown: false,
        }}
      />

      {/* ── Relatórios / Outros ─────────────────────────────────────── */}

      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          title: "Relatórios",
        }}
      />

      <Stack.Screen
        name="Birthdays"
        component={BirthdaysScreen}
        options={{
          title: "Aniversariantes",
        }}
      />

      {/* ── Terminologia ────────────────────────────────────────────── */}

      <Stack.Screen
        name="Terminology"
        component={TerminologyScreen}
        options={{
          title: "Termos e Vocabulário",
        }}
      />

      {/* ── Perfil da Igreja ────────────────────────────────────────── */}

      <Stack.Screen
        name="ChurchProfile"
        component={ChurchProfile}
        options={{
          title: "Igreja",
        }}
      />
    </Stack.Navigator>
  );
}