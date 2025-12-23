/**
 * Pagina HomePage
 * Schermata di login con consenso privacy e GPS
 */

import LoginForm from '../components/forms/LoginForm'

export default function HomePage({ onLogin }) {
  return <LoginForm onLogin={onLogin} />
}
