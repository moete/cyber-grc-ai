import { Modal } from './Modal'
import { DeleteOrgForm } from './DeleteOrgForm'
import type { DeleteOrgFormProps } from './DeleteOrgForm'

/** Delete-organisation modal: Modal (danger) + DeleteOrgForm. Render when open. */
export function DeleteOrgModal(props: DeleteOrgFormProps) {
  return (
    <Modal title="Delete organisation" onClose={props.onClose} variant="danger">
      <DeleteOrgForm {...props} />
    </Modal>
  )
}
