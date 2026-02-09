import React, { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable,TouchableOpacity, StyleSheet } from "react-native";
import {
  Calendar,
  DateData,
  LocaleConfig,
} from "react-native-calendars";
import * as Localization from "expo-localization";
import { Ionicons } from "@expo/vector-icons";
import { router } from 'expo-router'
//
// ===== Idiomas =====
//

LocaleConfig.locales["en"] = {
  monthNames: [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ],
  monthNamesShort: [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ],
  dayNames: [
    "Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"
  ],
  dayNamesShort: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  today: "Today",
};

LocaleConfig.locales["pt-br"] = {
  monthNames: [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ],
  monthNamesShort: [
    "Jan","Fev","Mar","Abr","Mai","Jun",
    "Jul","Ago","Set","Out","Nov","Dez"
  ],
  dayNames: [
    "Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"
  ],
  dayNamesShort: ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],
  today: "Hoje",
};

// pega idioma do dispositivo (funciona no web e no celular)
const languageTag =
  Localization.getLocales?.()?.[0]?.languageTag ?? "en-US";

LocaleConfig.defaultLocale = languageTag.toLowerCase().startsWith("pt")
  ? "pt-br"
  : "en";

//
// ===== Tipos =====
//

type ClientAgendaItem = {
  id: string;
  client: string;
  service: string;
  time: string;
  date: string;
};

export default function ClientAgenda() {
  const [selectedDate, setSelectedDate] = useState("2026-02-04");

  const appointments = useMemo<ClientAgendaItem[]>(
    () => [
      {
        id: "1",
        client: "João",
        service: "Manutenção",
        time: "10:00",
        date: "2026-02-04",
      },
      {
        id: "2",
        client: "Maria",
        service: "Instalação",
        time: "14:00",
        date: "2026-02-04",
      },
      {
        id: "3",
        client: "Carlos",
        service: "Orçamento",
        time: "09:00",
        date: "2026-02-05",
      },
    ],
    []
  );

  const dayItems = useMemo(() => {
    return appointments
      .filter((a) => a.date === selectedDate)
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const a of appointments) {
      marks[a.date] = { marked: true };
    }
    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: "#2563EB",
    };
    return marks;
  }, [appointments, selectedDate]);

  const renderHeader = (date: Date) => {
    const label = new Intl.DateTimeFormat(languageTag, {
      month: "long",
      year: "numeric",
    }).format(date);

    const title = label.charAt(0).toUpperCase() + label.slice(1);

    return (
      <View style={{ paddingHorizontal: 8, paddingVertical: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>
          {title}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 12, paddingTop: 30 }}>
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 8,
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <Calendar
          markedDates={markedDates}
          onDayPress={(day: DateData) =>
            setSelectedDate(day.dateString)
          }
          renderHeader={renderHeader}
        />
      </View>

      <Text style={{ fontWeight: "700", fontSize: 16 }}>
        Clientes em{" "}
        {new Intl.DateTimeFormat(languageTag).format(
          new Date(selectedDate)
        )}
      </Text>

      <FlatList
        data={dayItems}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 8 }}
        ListEmptyComponent={
          <Text style={{ marginTop: 8, opacity: 0.7 }}>
            Sem clientes nesse dia.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={{
              backgroundColor: "#fff",
              padding: 14,
              borderRadius: 12,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text style={{ fontWeight: "800" }}>{item.client}</Text>
            <Text>{item.service}</Text>
            <Text style={{ marginTop: 4, opacity: 0.8 }}>
              {item.time}
            </Text>
          </Pressable>
        )}
      />
            <TouchableOpacity
              onPress={() => router.push("../routes/create")}
              style={styles.fab}
              activeOpacity={0.9}
            >
              <Ionicons name="add" size={26} color="#fff" />
            </TouchableOpacity>
    </View>
  );
  
}
const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

})