import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../store/gameStore';
import { fetchCountries } from '../services/api';
import styles from './styles/JoinGame.module.css';

export default function JoinGame() {
	const ws = useGameStore((s) => s.webSocket);
	const players = useGameStore((s) => s.players);
	const setPlayers = useGameStore((s) => s.setPlayers);
	const setCountries = useGameStore((s) => s.setCountries);
	const setBorders = useGameStore((s) => s.setBorders);
	const setCurrentPlayerId = useGameStore((s) => s.setCurrentPlayerId);
	const setStage = useGameStore((s) => s.setStage);
	const setBonusTroops = useGameStore((s) => s.setBonusTroops);
	const user = useGameStore((s) => s.user);

	const [games, setGames] = useState([]);
	const [joined, setJoined] = useState(false);
	const [pendingMap, setPendingMap] = useState(null);
	const [pendingTurn, setPendingTurn] = useState(null);
	const [pendingStage, setPendingStage] = useState(null);
	const [selectedGame, setSelectedGame] = useState(null);
	const [tokenInput, setTokenInput] = useState('');
	const [errorMessage, setErrorMessage] = useState('');

	const navigate = useNavigate();

	useEffect(() => {
		if (!ws) return;
		const handleMessage = async (ev) => {
		// A vegades el ws al enviar o rebre dades pel meu servidor intermig, ho feia com un blob, fent això m'asseguro què
		// tant si el missatge arriba com a Blob com si arriba com a text, acabei obtenint el continugt llegible
		const raw = ev.data instanceof Blob ? await ev.data.text() : ev.data;
		let msg;
		try { msg = JSON.parse(raw); } catch { return; }

		switch (msg.action) {
			case 'games_list':
			setGames(msg.games);
			break;
			case 'player_list':
			setPlayers(msg.players);
			break;
			case 'map_update':
			if (joined) setPendingMap(msg.countries);
			break;
			case 'player_turn':
			if (joined) setPendingTurn(msg.playerId);
			break;
			case 'stage_change':
			if (joined) setPendingStage(msg.stage);
			break;
			case 'bonus_to_place':
			if (msg.playerId === user.id) {
				setBonusTroops(msg.totalTroopsToPlace);
			}
			break;
			case 'error':
			setErrorMessage(msg.message);
			setJoined(false);
			setSelectedGame(null);
			break;
			default:
			break;
		}
		};
		ws.addEventListener('message', handleMessage);
		return () => ws.removeEventListener('message', handleMessage);
	}, [ws, joined, setPlayers, setBonusTroops, user.id]);

	useEffect(() => {
		if (joined && pendingMap && pendingTurn != null) {
		(async () => {
			const base = await fetchCountries();
			const merged = base.map((c) => {
			const upd = pendingMap.find((u) => u.countryId === c.id);
			return upd
				? { ...c, troops: upd.troops, owner: upd.playerId }
				: c;
			});
			setCountries(merged);
			setCurrentPlayerId(pendingTurn);
			navigate('/game');
		})();
		}
	}, [
		joined,
		pendingMap,
		pendingTurn,
		pendingStage,
		setCountries,
		setBorders,
		setCurrentPlayerId,
		navigate,
	]);

	useEffect(() => {
		if (ws && ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({ action: 'list_games' }));
		}
	}, [ws]);

	const refreshGames = () => {
		if (ws?.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({ action: 'list_games' }));
		}
	};

	const handleJoinGame = (game) => {
		ws.send(JSON.stringify({ action: 'join_game', token: String(game.token) }));
		setSelectedGame(game);
		setJoined(true);
	};

	const handleTokenJoin = () => {
		if (!tokenInput) return;
		ws.send(JSON.stringify({ action: 'join_game', token: tokenInput }));
		setSelectedGame({ gameName: 'Partida privada', maxPlayers: 0 });
		setJoined(true);
	};

	if (joined && selectedGame) {
		return (
		<div className={styles.joinContainer}>
			<div className={styles.loaderContainer}>
			<div className={styles.loader}></div>
			<p>
				Esperant que comenci la partida: ({players.length}/{selectedGame.maxPlayers} jugadors)...
			</p>
			</div>
		</div>
		);
	}

	return (
		<div className={styles.joinContainer}>
		<h1>Partides Disponibles</h1>
		{errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}
		<div className={styles.searchGroup}>
			<button className={styles.refreshButton} onClick={refreshGames}>
			Buscar partides
			</button>
			<input
			type="text"
			placeholder="Token de partida privada"
			value={tokenInput}
			onChange={(e) => setTokenInput(e.target.value)}
			maxLength={36}
			className={styles.tokenInput}
			/>
			<button className={styles.searchButton} onClick={handleTokenJoin}>
			Unir per token
			</button>
		</div>
		<div className={styles.gamesGrid}>
			{games.length === 0 ? (
			<p>No hi ha partides disponibles</p>
			) : (
			games.map((game) => (
				<div key={game.id} className={styles.gameCard}>
				<p><strong>Partida:</strong> {game.gameName}</p>
				<p><strong>Jugadors:</strong> {game.players} / {game.maxPlayers}</p>
				<button onClick={() => handleJoinGame(game)}>Unir-se</button>
				</div>
			))
			)}
		</div>
		</div>
	);
}