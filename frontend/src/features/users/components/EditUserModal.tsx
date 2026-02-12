import { Modal } from './Modal'
import { EditUserForm } from './EditUserForm'
import type { EditUserFormProps } from './EditUserForm'

/** Edit-user modal: Modal + EditUserForm. Render when open (e.g. {editingUser && <EditUserModal ... />}). */
export function EditUserModal(props: EditUserFormProps) {
  return (
    <Modal title="Edit user" onClose={props.onClose}>
      <EditUserForm {...props} />
    </Modal>
  )
}
