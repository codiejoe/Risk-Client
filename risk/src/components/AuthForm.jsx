import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../store/gameStore';
import { loginUser, registerUser, fetchAvatars } from '../services/api';
import styles from './styles/AuthForm.module.css';

function AuthForm() {
	const [mode, setMode] = useState('login');
	const [form, setForm] = useState({
		firstName: '', lastName: '', email: '',
		username: '', password: '', confirmPassword: '',
		avatarId: 1,
	});

	const [avatars, setAvatars] = useState([]);
	const [selectedAvatarId, setSelectedAvatarId] = useState(1);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	// Store globals
	const login = useGameStore((s) => s.login);
	const setPassword = useGameStore((s) => s.setPassword);
	const navigate = useNavigate();

	useEffect(() => {
		if (mode === 'register') {
			// Obtenim els avatars i deixem preseleccionat el primer de la llista sempre: https://v1.scrimba.com/articles/react-spread-operator/
			fetchAvatars()
				.then((data) => {
				setAvatars(data);
				setSelectedAvatarId(data[0].id ?? 1);
				setForm((prev) => ({ ...prev, avatarId: data[0].id ?? 1 })); // copiem TOTS els valors anteriors amb spread operator i assignem l'avatar
				})
				.catch(console.error);
		}
	}, [mode]);

	// Si canvia selectedAvatarId, s'actualitza el form
	useEffect(() => {
		setForm((prev) => ({ ...prev, avatarId: selectedAvatarId }));
	}, [selectedAvatarId]);

	const handleSubmit = async (e) => {
		e.preventDefault(); setError(''); setLoading(true);
		try {
			let user;
			if (mode === 'login') {
				user = await loginUser({ username: form.username, password: form.password });
			} else {
				if (form.password !== form.confirmPassword) throw new Error('Les contrasenyes han de coincidir');
				user = await registerUser({ ...form });
			}
			login(user, form.password);
			setPassword(form.password);
			navigate('/');
		}
		catch (err) {
		setError(err.message);
		} 
		finally {
			setLoading(false);
		}
	};

	return (
		<div className={styles.authContainer}>
			<div className={styles.authBox}>
				<form onSubmit={handleSubmit} className={styles.authForm}>
					<h2 className={styles.authTitle}>
						{mode === 'login' ? 'Iniciar sessió' : 'Registrar-se'}
					</h2>
					<input
						type="text" placeholder="Usuari"
						value={form.username}
						onChange={(e) => setForm({ ...form, username: e.target.value })}
						required className={styles.authInput}
					/>
					<input
						type="password" placeholder="Contrasenya"
						value={form.password}
						onChange={(e) => setForm({ ...form, password: e.target.value })}
						required className={styles.authInput}
					/>
					{mode === 'register' && (
						<>
						<input
							type="password" placeholder="Repetir contrasenya"
							value={form.confirmPassword}
							onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
							required className={styles.authInput}
						/>
						<input
							type="text" placeholder="Nom"
							value={form.firstName}
							onChange={(e) => setForm({ ...form, firstName: e.target.value })}
							required className={styles.authInput}
						/>
						<input
							type="text" placeholder="Cognom"
							value={form.lastName}
							onChange={(e) => setForm({ ...form, lastName: e.target.value })}
							required className={styles.authInput}
						/>
						<input
							type="email" placeholder="Correu electrònic"
							value={form.email}
							onChange={(e) => setForm({ ...form, email: e.target.value })}
							required className={styles.authInput}
						/>

						<div className={styles.avatarContainer}>
							<label className={styles.avatarLabel}>Tria un avatar:</label>
							<div className={styles.avatarGrid}>
							{avatars.map((avatar) => (
								<div
								key={avatar.id}
								className={`${styles.avatarItem} ${selectedAvatarId === avatar.id ? styles.avatarItemSelected : ''}`}
								onClick={() => setSelectedAvatarId(avatar.id)}
								>
								<img src={avatar.url} alt={avatar.name} className={styles.avatarImage} />
								</div>
							))}
							</div>
						</div>
						</>
					)}
					<button type="submit" disabled={loading} className={styles.submitButton}>
						{loading
						? mode === 'login' ? 'Iniciant...' : 'Registrant...'
						: mode === 'login' ? 'Entrar' : 'Registrar'}
					</button>
					{error && <p style={{ color: 'red' }}>{error}</p>}
				</form>
				<button
					onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
					className={styles.toggleButton}
				>
				{mode === 'login' ? 'Registra\'t' : 'Torna a login'}
				</button>
			</div>
		</div>
	);
}

export default AuthForm;
