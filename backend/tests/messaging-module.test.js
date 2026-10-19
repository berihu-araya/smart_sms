/**
 * Verification Script: Backend Messaging Module (Production Readiness Test)
 * Tests repository, service layer, RBAC contact discovery, and live HTTP endpoints.
 */

const jwt = require('jsonwebtoken');
const { db } = require('../src/config/database');
const env = require('../src/config/env');
const MessageRepository = require('../src/modules/messages/message.repository');
const MessageService = require('../src/modules/messages/message.service');

async function runTests() {
  console.log('🚀 Starting Backend Messaging Module Verification...\n');

  const repository = new MessageRepository(db);
  const service = new MessageService(repository, db);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Setup Test School and Users
    console.log('--- Phase 1: Setup Test Fixtures ---');
    const schoolRes = await db.query('SELECT id, name FROM schools LIMIT 1');
    assert(schoolRes.rows.length > 0, 'School found in database');
    const school = schoolRes.rows[0];
    const schoolId = school.id;
    console.log(`  School: ${school.name} (${schoolId})`);

    // Fetch Admin, Teacher, and Parent users
    const usersRes = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.school_id, r.name as role
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.school_id = $1 AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
    `, [schoolId]);

    const adminUser = usersRes.rows.find((u) => u.role.includes('Admin')) || usersRes.rows[0];
    const teacherUser = usersRes.rows.find((u) => u.role === 'Teacher') || usersRes.rows[1] || adminUser;
    const parentUser = usersRes.rows.find((u) => u.role === 'Parent') || usersRes.rows[2] || adminUser;

    assert(adminUser, `Admin User resolved: ${adminUser.email}`);
    assert(teacherUser, `Teacher User resolved: ${teacherUser.email}`);
    assert(parentUser, `Parent User resolved: ${parentUser.email}`);

    // Optional student context
    const studentRes = await db.query(
      `SELECT id, first_name, last_name FROM students WHERE school_id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1`,
      [schoolId]
    );
    const testStudent = studentRes.rows[0] || null;
    if (testStudent) {
      console.log(`  Test Student: ${testStudent.first_name} ${testStudent.last_name} (${testStudent.id})`);
    }

    // Generate JWT tokens for live HTTP testing
    const adminToken = jwt.sign(
      { sub: adminUser.id, id: adminUser.id, email: adminUser.email, role: adminUser.role, school_id: schoolId },
      env.jwtSecret,
      { expiresIn: '1h' }
    );
    const teacherToken = jwt.sign(
      { sub: teacherUser.id, id: teacherUser.id, email: teacherUser.email, role: teacherUser.role, school_id: schoolId },
      env.jwtSecret,
      { expiresIn: '1h' }
    );

    // 2. Test Contact Discovery
    console.log('\n--- Phase 2: Contact Discovery & RBAC ---');
    const adminContacts = await service.getEligibleContacts(schoolId, adminUser);
    assert(Array.isArray(adminContacts.contacts), 'Admin receives eligible contact list');

    const teacherContacts = await service.getEligibleContacts(schoolId, teacherUser);
    assert(Array.isArray(teacherContacts.contacts), 'Teacher receives eligible contact list');

    const parentContacts = await service.getEligibleContacts(schoolId, parentUser);
    assert(Array.isArray(parentContacts.contacts), 'Parent receives eligible contact list');

    // 3. Test Conversation Creation
    console.log('\n--- Phase 3: Create & Retrieve Conversation ---');
    const convResult = await service.getOrCreateConversation(schoolId, adminUser, {
      recipient_id: teacherUser.id !== adminUser.id ? teacherUser.id : usersRes.rows[1].id,
      type: 'DIRECT',
      title: 'Academic Remediation Discussion',
      student_id: testStudent?.id || null,
      initial_message: 'Hello teacher, I would like to consult about the student progress.',
    });

    assert(convResult && convResult.conversation, 'Conversation created or found');
    const convId = convResult.conversation.id;
    assert(convId, `Conversation ID: ${convId}`);

    // Check conversation by ID
    const fetchedConv = await service.getConversationById(convId, adminUser);
    assert(fetchedConv.id === convId, 'getConversationById returns valid thread');
    assert(fetchedConv.participants && fetchedConv.participants.length >= 2, 'Conversation has at least 2 participants');

    // 4. Test Message Stream & Sending Reply
    console.log('\n--- Phase 4: Message Stream & Reply Dispatch ---');
    const initialMessages = await service.getConversationMessages(convId, adminUser, { page: 1, limit: 10 });
    assert(Array.isArray(initialMessages.messages), 'Initial message stream retrieved');
    assert(initialMessages.messages.length >= 1, 'Initial message present in thread');

    const otherRecipientId = teacherUser.id !== adminUser.id ? teacherUser.id : usersRes.rows[1].id;
    const recipientUserObj = usersRes.rows.find((u) => u.id === otherRecipientId);

    // Reply from recipient
    const replyMessage = await service.sendMessage(convId, recipientUserObj, {
      content: 'Thank you for reaching out! Let us schedule a meeting tomorrow afternoon.',
      reply_to_message_id: initialMessages.messages[0]?.id || null,
    });
    assert(replyMessage && replyMessage.content.includes('meeting tomorrow'), 'Reply message sent successfully');

    // 5. Test Unread Count & Read Receipts
    console.log('\n--- Phase 5: Unread Counters & Read Receipts ---');
    const senderUnreadBefore = await service.getUnreadCount(schoolId, adminUser);
    assert(senderUnreadBefore.unread_count > 0, `Admin unread count incremented after reply: ${senderUnreadBefore.unread_count}`);

    // Mark as read
    await service.markAsRead(convId, adminUser);
    const senderUnreadAfter = await service.getUnreadCount(schoolId, adminUser);
    assert(senderUnreadAfter.unread_count === 0, 'Admin unread count reset to 0 after markAsRead');

    // 6. Test Participant Settings (Archive & Star)
    console.log('\n--- Phase 6: Participant Thread Settings ---');
    const updatedSettings = await service.updateParticipantSettings(convId, adminUser, {
      is_starred: true,
      is_muted: true,
    });
    assert(updatedSettings && updatedSettings.is_starred === true, 'Conversation starred successfully');
    assert(updatedSettings && updatedSettings.is_muted === true, 'Conversation muted successfully');

    // Restore
    await service.updateParticipantSettings(convId, adminUser, { is_starred: false, is_muted: false });

    // 7. Test Soft Delete Message
    console.log('\n--- Phase 7: Soft Delete Audit Safeguard ---');
    const deleteResult = await service.deleteMessage(replyMessage.id, recipientUserObj);
    assert(deleteResult && deleteResult.deleted_at, 'Message soft-deleted with audit timestamp');

    // Verify deleted message is omitted from standard listing
    const messagesAfterDelete = await service.getConversationMessages(convId, adminUser, { page: 1, limit: 10 });
    const exists = messagesAfterDelete.messages.some((m) => m.id === replyMessage.id);
    assert(!exists, 'Deleted message successfully excluded from active stream');

    // 8. Test Live HTTP API Endpoints
    console.log('\n--- Phase 8: Live HTTP API Endpoints ---');
    const baseUrl = 'http://localhost:5000/api/v1/messages';

    // A. Unread count endpoint
    const unreadRes = await fetch(`${baseUrl}/unread-count`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const unreadData = await unreadRes.json();
    assert(unreadRes.status === 200 && unreadData.success, 'GET /api/v1/messages/unread-count -> 200 OK');

    // B. Contacts endpoint
    const contactsRes = await fetch(`${baseUrl}/contacts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const contactsData = await contactsRes.json();
    assert(contactsRes.status === 200 && Array.isArray(contactsData.data), 'GET /api/v1/messages/contacts -> 200 OK');

    // C. List conversations endpoint
    const listRes = await fetch(`${baseUrl}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = await listRes.json();
    assert(listRes.status === 200 && Array.isArray(listData.data), 'GET /api/v1/messages -> 200 OK');

    // D. Get conversation detail endpoint
    const getRes = await fetch(`${baseUrl}/${convId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getData = await getRes.json();
    assert(getRes.status === 200 && getData.data.id === convId, `GET /api/v1/messages/${convId} -> 200 OK`);

    // E. List messages endpoint
    const msgRes = await fetch(`${baseUrl}/${convId}/messages`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const msgData = await msgRes.json();
    assert(msgRes.status === 200 && Array.isArray(msgData.data), `GET /api/v1/messages/${convId}/messages -> 200 OK`);

    // Summary
    console.log('\n========================================');
    console.log(`🏁 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('💥 Test execution error:', error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

runTests();
