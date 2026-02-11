import { test } from '@japa/runner'
import {
  hasPermission,
  canAccessResource,
  Permission,
  Roles,
} from 'shared'

test.group('RBAC permissions', () => {
  test('Owner has all permissions', ({ assert }) => {
    const allPermissions = Object.values(Permission)

    for (const perm of allPermissions) {
      assert.isTrue(
        hasPermission(Roles.OWNER, perm as Permission),
        `Owner should have permission ${perm}`
      )
    }
  })

  test('Analyst cannot delete suppliers', ({ assert }) => {
    assert.isFalse(
      hasPermission(Roles.ANALYST, Permission.SUPPLIER_DELETE),
      'Analyst must not be allowed to delete suppliers'
    )
  })

  test('Auditor is read-only on suppliers', ({ assert }) => {
    assert.isTrue(
      hasPermission(Roles.AUDITOR, Permission.SUPPLIER_READ),
      'Auditor should be able to read suppliers'
    )
    assert.isFalse(
      hasPermission(Roles.AUDITOR, Permission.SUPPLIER_CREATE),
      'Auditor must not be able to create suppliers'
    )
    assert.isFalse(
      hasPermission(Roles.AUDITOR, Permission.SUPPLIER_UPDATE),
      'Auditor must not be able to update suppliers'
    )
    assert.isFalse(
      hasPermission(Roles.AUDITOR, Permission.SUPPLIER_DELETE),
      'Auditor must not be able to delete suppliers'
    )
  })
})

test.group('Tenant isolation helper', () => {
  test('User cannot access resource of another organisation', ({ assert }) => {
    const canAccess = canAccessResource(
      Roles.ADMIN,
      'org-a',
      'org-b',
      Permission.SUPPLIER_READ
    )

    assert.isFalse(
      canAccess,
      'User from org-a must not access resource from org-b'
    )
  })

  test('User with permission can access resource in same organisation', ({ assert }) => {
    const canAccess = canAccessResource(
      Roles.ADMIN,
      'org-a',
      'org-a',
      Permission.SUPPLIER_READ
    )

    assert.isTrue(
      canAccess,
      'Admin with SUPPLIER_READ should access resource in same org'
    )
  })
})

