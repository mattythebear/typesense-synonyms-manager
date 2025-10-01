// pages/_app.js
import '../styles/globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import { TypesenseProvider } from '../contexts/TypesenseContext'

export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <TypesenseProvider>
        <Component {...pageProps} />
      </TypesenseProvider>
    </AuthProvider>
  )
}