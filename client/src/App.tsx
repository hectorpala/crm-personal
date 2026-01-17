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

function App() {
  return (
    <>
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
      <Toaster />
    </>
  )
}

export default App
