import { create } from 'zustand';

const defaultPalette = [
	'#e6194b', '#3cb44b', '#ffe119', '#4363d8',
	'#f58231', '#911eb4', '#46f0f0', '#f032e6',
	'#bcf60c', '#fabebe', '#008080', '#e6beff'
];

const useGameStore = create((set) => ({
	// Dades de sessió
	user: null,
	password: null,
	webSocket: null,
	sessionId: null,
	loading: false,
	error: null,

	// Estat de partida
	countries: [],       // [{id, name, continentId, troops?, owner?}, …]
	players: [],         // [{ id, username, avatar_url }, …]
	playerColors: {},    // { playerId: color, … }
	currentPlayerId: null,
	stage: null,         // "BONUS", "ATTACKING", etc.
	bonusTroops: 0,
	attackerCountryId: null,
	defenderCountryId: null,

	// Autenticació
	login: (userData, password) =>
		set({ user: userData, password, error: null, loading: false }),
	setPassword: (password) => set({ password }),
	logout: () =>
		set({
		user: null,
		password: null,
		webSocket: null,
		sessionId: null,
		error: null,
		loading: false,
		}),

	// Estat UI local compartit
	selTroops: 1,
	setSelTroops: (n) => set({ selTroops: n }),
	selectedCountryId: null,
	setSelectedCountryId: (id) => set({ selectedCountryId: id }),

	// Setters globals
	setWebSocket: (ws) => set({ webSocket: ws }),
	setSessionId: (sessionId) => set({ sessionId }),
	setCurrentPlayerId: (playerId) => set({ currentPlayerId: playerId }),
	setStage: (stage) => set({ stage }),
	setError: (errorMessage) => set({ error: errorMessage, loading: false }),
	setLoading: (isLoading) => set({ loading: isLoading }),

	setCountries: (countries) => set({ countries: Array.isArray(countries) ? countries : [] }),

	// Players i colors
	setPlayers: (players) => {
		set({ players: Array.isArray(players) ? players : [] });
		const colors = {};
		(Array.isArray(players) ? players : []).forEach((player, idx) => {
		colors[player.id] = defaultPalette[idx % defaultPalette.length];
		});
		set({ playerColors: colors });
	},
	setPlayerColors: (colors) => set({ playerColors: colors }),

	setBonusTroops: (n) => set({ bonusTroops: n }),
	decrementBonus: () => set((s) => ({ bonusTroops: s.bonusTroops - 1 })),

	// Selecció atac
	setAttackerCountryId: (id) => set({ attackerCountryId: id, defenderCountryId: null }),
	setDefenderCountryId: (id) => set({ defenderCountryId: id }),
	clearAttackSelection: () => set({ attackerCountryId: null, defenderCountryId: null }),

	// Per fer un reset del joc un cop s'acaba o sortim
	resetGame: () => set({
		countries: [],
		players: [],
		playerColors: {},
		currentPlayerId: null,
		stage: null,
		bonusTroops: 0,
		attackerCountryId: null,
		defenderCountryId: null,
		selTroops: 1,
		selectedCountryId: null,
		loading: false,
		error: null,
	}),
}));

export default useGameStore;
// exportem els colosr també
export { defaultPalette };