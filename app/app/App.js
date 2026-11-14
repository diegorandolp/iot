import React, { useCallback, useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, Vibration, Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CONFIG } from "./src/config";
import { getEstado, getEventos, abrirPuerta, horaPeru } from "./src/api";

const C = { bg: "#0f1419", card: "#1a222c", text: "#e8eef5", mute: "#8a97a6", accent: "#3ddc97", err: "#ff6b6b" };

const NIVEL = { critico: C.err, advertencia: "#ffb84d", info: C.accent };

function StatusScreen() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await getEstado());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, CONFIG.POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const online = data?.dispositivo === "conectado";

  return (
    <ScrollView contentContainerStyle={s.pad}>
      <View style={s.card}>
        <View style={s.row}>
          <View style={[s.dot, { backgroundColor: online ? C.accent : C.err }]} />
          <Text style={s.title}>Puerta inteligente</Text>
        </View>
        <Text style={s.mute}>{error ? `Sin conexión: ${error}` : online ? "Dispositivo conectado" : "Dispositivo desconectado"}</Text>
      </View>
      <View style={s.grid}>
        <View style={[s.card, s.tile]}>
          <Text style={s.mute}>Puerta</Text>
          <Text style={s.value}>{data?.puerta ?? "—"}</Text>
        </View>
        <View style={[s.card, s.tile]}>
          <Text style={s.mute}>Última conexión</Text>
          <Text style={[s.value, { fontSize: 16 }]}>{horaPeru(data?.ultima_conexion)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function EventsScreen() {
  const [eventos, setEventos] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await getEventos();
      setEventos(r.eventos || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, CONFIG.POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <ScrollView contentContainerStyle={s.pad}>
      {error && <Text style={[s.mute, { color: C.err, marginBottom: 12 }]}>Error: {error}</Text>}
      {!error && eventos.length === 0 && <Text style={s.mute}>Sin eventos</Text>}
      {eventos.map((e, i) => (
        <View key={`${e.timestamp}-${i}`} style={[s.card, { borderLeftWidth: 4, borderLeftColor: NIVEL[e.nivel] || C.mute }]}>
          <Text style={s.title}>{e.tipo}</Text>
          <Text style={[s.mute, { color: C.text }]}>{e.mensaje}</Text>
          <Text style={s.mute}>{horaPeru(e.timestamp)} · {e.nivel}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

function DoorScreen() {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const press = (k) => {
    if (busy || !k) return;
    setMsg(null);
    if (k === "⌫") return setPin((p) => p.slice(0, -1));
    setPin((p) => (p.length < CONFIG.PIN_LENGTH ? p + k : p));
  };

  const submit = async () => {
    setBusy(true);
    try {
      await abrirPuerta(pin);
      setMsg({ ok: true, text: "Comando de apertura enviado ✔" });
    } catch (e) {
      Vibration.vibrate(300);
      setMsg({ ok: false, text: e.message });
    } finally {
      setPin("");
      setBusy(false);
    }
  };

  const ready = pin.length === CONFIG.PIN_LENGTH && !busy;

  return (
    <View style={[s.pad, { alignItems: "center" }]}>
      <Text style={s.title}>Ingresa tu PIN</Text>
      <View style={[s.row, { marginVertical: 24 }]}>
        {Array.from({ length: CONFIG.PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[s.pinDot, i < pin.length && { backgroundColor: C.accent }]} />
        ))}
      </View>
      <Text style={[s.mute, { height: 22, color: msg ? (msg.ok ? C.accent : C.err) : C.mute }]}>{msg?.text ?? ""}</Text>
      <View style={s.keypad}>
        {KEYS.map((k, i) => (
          <Pressable key={i} onPress={() => press(k)} style={({ pressed }) => [s.key, !k && { opacity: 0 }, pressed && { backgroundColor: "#243041" }]}>
            <Text style={s.keyText}>{k}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable disabled={!ready} onPress={submit} style={[s.open, !ready && { opacity: 0.4 }]}>
        <Text style={s.openText}>{busy ? "Enviando…" : "Abrir puerta"}</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [tab, setTab] = useState("status");
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>{tab === "status" ? <StatusScreen /> : tab === "events" ? <EventsScreen /> : <DoorScreen />}</View>
      <View style={s.tabs}>
        {[["status", "Estado"], ["events", "Eventos"], ["door", "Puerta"]].map(([id, label]) => (
          <Pressable key={id} style={s.tab} onPress={() => setTab(id)}>
            <Text style={[s.tabText, tab === id && { color: C.accent }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0 },
  pad: { padding: 16 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "48.5%" },
  row: { flexDirection: "row", alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  title: { color: C.text, fontSize: 20, fontWeight: "700" },
  mute: { color: C.mute, fontSize: 13, marginTop: 4 },
  value: { color: C.text, fontSize: 26, fontWeight: "600", marginTop: 6 },
  pinDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.mute, marginHorizontal: 10 },
  keypad: { flexDirection: "row", flexWrap: "wrap", width: 270, justifyContent: "space-between", marginTop: 12 },
  key: { width: 80, height: 64, borderRadius: 16, backgroundColor: C.card, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  keyText: { color: C.text, fontSize: 26, fontWeight: "500" },
  open: { backgroundColor: C.accent, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, marginTop: 8 },
  openText: { color: "#06281a", fontSize: 18, fontWeight: "700" },
  tabs: { flexDirection: "row", backgroundColor: C.card },
  tab: { flex: 1, alignItems: "center", paddingVertical: 16 },
  tabText: { color: C.mute, fontSize: 15, fontWeight: "600" },
});
