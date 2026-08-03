import { getNote } from './actions'
import NoteEditor from './NoteEditor'
import { redirect } from 'next/navigation'

export default async function NotePage({ params }: { params: { id: string } }) {
  // Await the params object before accessing properties
  const { id } = await params
  
  const note = await getNote(id)

  if (!note) {
    redirect('/dashboard')
  }

  return <NoteEditor noteId={id} initialData={note} />
}
