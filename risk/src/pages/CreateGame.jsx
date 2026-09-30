import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../store/gameStore';
import { fetchCountries } from '../services/api';
import styles from './styles/CreateGame.module.css';

export default function CreateGame() {
	const ws = useGameStore((s) => s.webSocket);
	const players = useGameStore((s) => s.players);
	const setPlayers = useGameStore((s) => s.setPlayers);
	const setCountries = useGameStore((s) => s.setCountries);
	const setBorders = useGameStore((s) => s.setBorders);
	const setCurrentPlayerId = useGameStore((s) => s.setCurrentPlayerId);
	const setStage = useGameStore((s) => s.setStage);
	const setBonusTroops = useGameStore((s) => s.setBonusTroops);
	const user = useGameStore((s) => s.user);

	const [gameName, setGameName] = useState('');
	const [maxPlayers, setMaxPlayers] = useState(2);
	const [isPrivate, setIsPrivate] = useState(false);
	const [created, setCreated] = useState(false);
	const [token, setToken] = useState(null);
	const [pendingMap, setPendingMap] = useState(null);
	const [pendingTurn, setPendingTurn] = useState(null);
	const [pendingStage, setPendingStage] = useState(null);

	const navigate = useNavigate();

	useEffect(() => {
		if (!ws) return;
		const handleMessage = async (ev) => {
			const raw = ev.data instanceof Blob ? await ev.data.text() : ev.data;
			let msg;
			try { msg = JSON.parse(raw); } catch { return; }
			
			switch (msg.action) {
				case 'player_list':
					setPlayers(msg.players);
					break;
					
				case 'game_created':
					setCreated(true);
					if (!msg.isPublic && msg.token) setToken(msg.token);
					break;

				case 'map_update':
					if (created) setPendingMap(msg.countries);
					break;

				case 'player_turn':
					if (created) setPendingTurn(msg.playerId);
					break;

				case 'stage_change':
					if (created) setPendingStage(msg.stage);
					break;

				case 'bonus_to_place':
					if (msg.playerId === user.id) {
						setBonusTroops(msg.totalTroopsToPlace);
					}
					break;

				default:
					break;
			}
		};

		ws.addEventListener('message', handleMessage);
		return () => ws.removeEventListener('message', handleMessage);
	}, [ws, created, setPlayers, setBonusTroops, user.id]);

	useEffect(() => {
		if (created && pendingMap && pendingTurn != null) {
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
				// setStage(pendingStage);
				navigate('/game');
			})();
		}
	}, [
		created,
		pendingMap,
		pendingTurn,
		pendingStage,
		setCountries,
		setBorders,
		setCurrentPlayerId,
		navigate,
	]);

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!ws || ws.readyState !== WebSocket.OPEN) {
		alert('El WebSocket no està connectat');
		return;
		}
		ws.send(JSON.stringify({
		action: 'create_game',
		gameName,
		isPublic: !isPrivate,
		maxPlayers: Number(maxPlayers),
		}));
	};

	if (!user || !ws) return <p>Esperant connexió...</p>;

	if (created) {
		return (
			<div className={styles.pageContainer}>
				<div className={styles.loaderContainer}>
				<div className={styles.loader}></div>
				<p>
					Creant partida "{gameName}"...<br />
					Jugadors: {players.length}/{maxPlayers}
				</p>
				{isPrivate && (
					<p><strong>Token:</strong> {token}</p>
				)}
				</div>
			</div>
		);
	}

	return (
		<div className={styles.pageContainer}>
			<div className={styles.createGameBox}>
				<h1 className={styles.createGameTitle}>Crear una nova partida</h1>
				<form onSubmit={handleSubmit} className={styles.formGroup}>
					<input
						type="text"
						placeholder="Nom de la partida"
						value={gameName}
						onChange={(e) => setGameName(e.target.value)}
						required
						className={styles.inputField}
					/>
					<input
						type="number"
						placeholder="Màx jugadors"
						value={maxPlayers}
						onChange={(e) => setMaxPlayers(e.target.value)}
						min="2"
						required
						className={styles.inputField}
					/>
					<label className={styles.labelField}>
						<input
						type="checkbox"
						checked={isPrivate}
						onChange={(e) => setIsPrivate(e.target.checked)}
						/>{' '}
						Partida privada
					</label>
					<button type="submit" className={styles.submitButton}>
						Crear partida
					</button>
				</form>
			</div>
		</div>
	);
}