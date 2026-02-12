import { Modal } from './Modal'
import { AddUserForm } from './AddUserForm'
import type { AddUserFormProps } from './AddUserForm'

/** Add-user modal: Modal + AddUserForm. Render when open (e.g. {showAdd && <AddUserModal ... />}). */
export function AddUserModal(props: AddUserFormProps) {
  return (
    <Modal title="Add user" onClose={props.onClose}>
      <AddUserForm {...props} />
    </Modal>
  )
}
