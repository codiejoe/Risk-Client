import { useEffect } from 'react';
import useGameStore, { defaultPalette } from '../store/gameStore';
import AuthForm from '../components/AuthForm';
import { useNavigate } from 'react-router-dom';
import styles from './styles/Home.module.css';

import {  WS_URL } from '../config';

// Funció per inicialitzar el WebSocket, només si no existeix
function initWebSocket(user, password, setWebSocket, setSessionId, setPlayers, setPlayerColors) {
    if (!user || !user.id || !password) return null;

const ws = new WebSocket(
    `${WS_URL}/ws/game?username=${user.username}&password=${password}&userId=${user.id}`
);

    const predefinedColors = defaultPalette;

    ws.addEventListener('message', async (ev) => {
        const raw = ev.data instanceof Blob ? await ev.data.text() : ev.data;
        let msg; try { msg = JSON.parse(raw); } catch { return; }
        console.log('WS rep:', msg);

        if (msg.action === 'connected' && msg.sessionId) {
            setSessionId(msg.sessionId);
            ws.send(JSON.stringify({ action: 'register', userId: user.id }));
        }
        if (msg.action === 'player_list' && Array.isArray(msg.players)) {
            setPlayers(msg.players);
            const colors = {};
            msg.players.forEach((id, idx) => {
                colors[id] = predefinedColors[idx % predefinedColors.length];
            });
            setPlayerColors(colors);
        }
    });

    ws.onopen = () => console.log('✅ WS obert');
    ws.onerror = (e) => console.error('❌ WS Error:', e);
    ws.onclose = (e) => console.warn('⚠️ WS tancat:', e);

    setWebSocket(ws);
    return ws;
}

function Home() {
    const user = useGameStore((s) => s.user);
    const ws = useGameStore((s) => s.webSocket);
    const setWebSocket = useGameStore((s) => s.setWebSocket);
    const setSessionId = useGameStore((s) => s.setSessionId);
    const setPlayers = useGameStore((s) => s.setPlayers);
    const setPlayerColors = useGameStore((s) => s.setPlayerColors);
    const password = useGameStore((s) => s.password); // password temporal guardada després de login
    const logout = useGameStore((s) => s.logout);
    const navigate = useNavigate();

    useEffect(() => {
        // Només crea el WS si tens user i no tens ja el WS
        if (user && (!ws || ws.readyState === WebSocket.CLOSED)) {
            initWebSocket(user, password, setWebSocket, setSessionId, setPlayers, setPlayerColors);
        }
        // Si tornes a la Home i l'usuari ja no existeix, tanquem el WS
        if (!user && ws) {
            ws.close();
            setWebSocket(null);
        }
    }, [user, ws, password, setWebSocket, setSessionId, setPlayers, setPlayerColors]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };
    // Si hi ha uusari, mostrem la home com a tal ...
    if (user) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.contentContainer}>
                    <div className={styles.profileHeader}>
                        {user.avatar?.url && (
                            <img 
                                src={user.avatar.url}
                                alt={`Avatar de ${user.username}`}
                                className={styles.avatar}
                            />
                        )}
                        <div className={styles.profileInfo}>
                            <h1 className={styles.title}>Salutacions, <span className={styles.username}>{user.username}</span>!</h1>
                            <p className={styles.stats}>
                                <span>Partides: {user.games || 0}</span>
                                <span>Victòries: {user.wins || 0}</span>
                            </p>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className={styles.logoutButton}
                        >
                            Tancar sessió
                        </button>
                    </div>

                    <div className={styles.optionsContainer}>
                        <div className={styles.optionsGrid}>
                            <button className={styles.optionCard} onClick={() => navigate('/profile')}>
                                <div className={styles.optionIcon}>👤</div>
                                <h3>Actualitzar perfil</h3>
                                <p>Modifica la teva informació</p>
                            </button>
                            <button className={styles.optionCard} onClick={() => navigate('/create-game')}>
                                <div className={styles.optionIcon}>🎮</div>
                                <h3>Crear partida</h3>
                                <p>Crea una nova partida</p>
                            </button>
                            <button className={styles.optionCard} onClick={() => navigate('/join-game')}>
                                <div className={styles.optionIcon}>👥</div>
                                <h3>Unir-se a partida</h3>
                                <p>Uneix-te a una partida existent</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    // Si no mostrem el formulari de login/registre amb ek modul d'authform
    return (
        <div className={styles.authPageContainer}>
            <div className={styles.authContainer}>
                <div className={styles.authBox}>
                    <h1 className={styles.welcomeTitle}>Benvingut a <span className={styles.appName}>Riskockette</span></h1>
                    <p className={styles.welcomeSubtitle}>Siusplau, inicia sessió o enregistra't per continuar</p>
                    <AuthForm />
                </div>
            </div>
        </div>
    );
}

export default Home;