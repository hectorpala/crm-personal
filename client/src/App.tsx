import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Contacts from '@/pages/Contacts'
import ContactDetail from '@/pages/ContactDetail'
import Pipeline from '@/pages/Pipeline'
import Tasks from '@/pages/Tasks'
import Messaging from '@/pages/Messaging'
import Settings from '@/pages/Settings'
import Privacy from '@/pages/Privacy'

function App() {
  return (
    <>
      <Routes>
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/:id" element={<ContactDetail />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/messaging" element={<Messaging />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        } />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
