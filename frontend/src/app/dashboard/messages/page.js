'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './page.module.css';
import messageService from '@/services/messageService';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/common/Modal';
import {
  FaEnvelope,
  FaSearch,
  FaPlus,
  FaPaperPlane,
  FaPaperclip,
  FaStar,
  FaRegStar,
  FaArchive,
  FaBellSlash,
  FaTimes,
  FaTrash,
  FaReply,
  FaCheck,
  FaCheckDouble,
  FaGraduationCap,
  FaUserGraduate,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaDownload,
  FaSync,
  FaInfoCircle,
} from 'react-icons/fa';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffInSeconds < 172800) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateDivider(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType = '') {
  if (mimeType.includes('pdf')) return <FaFilePdf className={styles.sharedFileIcon} />;
  if (mimeType.includes('image')) return <FaFileImage className={styles.sharedFileIcon} />;
  return <FaFileAlt className={styles.sharedFileIcon} />;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.sub;

  // Conversations State
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'UNREAD', 'TEACHERS', 'PARENTS', 'ARCHIVED'
  const [searchQuery, setSearchQuery] = useState('');

  // Active Thread State
  const [activeId, setActiveId] = useState(null);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Composer State
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [sending, setSending] = useState(false);

  // New Conversation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalInitialMsg, setModalInitialMsg] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);


  // Fetch Active Thread Messages
  const fetchMessages = useCallback(async (convId, shouldScroll = true) => {
    if (!convId || !currentUserId) return;
    try {
      const [convData, msgData] = await Promise.all([
        messageService.getConversation(convId),
        messageService.listMessages(convId, { limit: 100 }),
      ]);
      setActiveConv(convData);
      setMessages(msgData.data || []);
      if (shouldScroll) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Failed to load messages for conversation:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [scrollToBottom, currentUserId]);

  // Initial Load & Event Listeners
  useEffect(() => {
    let isMounted = true;

    async function loadInbox() {
      if (!currentUserId) return;
      try {
        const params = {};
        if (activeTab === 'ARCHIVED') {
          params.status = 'ARCHIVED';
        } else {
          params.status = 'ACTIVE';
          if (activeTab === 'UNREAD') params.unreadOnly = true;
        }
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const res = await messageService.listConversations(params);
        if (!isMounted) return;

        let items = res.data || [];
        if (activeTab === 'TEACHERS') {
          items = items.filter((item) =>
            item.other_participants?.some((p) => p.role === 'Teacher' || p.role_in_conversation === 'TEACHER')
          );
        } else if (activeTab === 'PARENTS') {
          items = items.filter((item) =>
            item.other_participants?.some((p) => p.role === 'Parent' || p.role_in_conversation === 'PARENT')
          );
        }

        setConversations(items);
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        if (isMounted) setLoadingConversations(false);
      }
    }

    loadInbox();

    const handleMessageSync = () => {
      loadInbox();
      if (activeId) fetchMessages(activeId, false);
    };

    window.addEventListener('smart-sms-message-change', handleMessageSync);
    // Background polling every 8s
    const pollInterval = setInterval(() => {
      loadInbox();
      if (activeId) fetchMessages(activeId, false);
    }, 8000);

    return () => {
      isMounted = false;
      window.removeEventListener('smart-sms-message-change', handleMessageSync);
      clearInterval(pollInterval);
    };
  }, [activeTab, searchQuery, activeId, currentUserId, fetchMessages]);

  // Select Thread
  const handleSelectConversation = (convId) => {
    setActiveId(convId);
    setReplyTo(null);
    setPendingAttachments([]);
    fetchMessages(convId);
  };

  // Send Message
  const handleSendMessage = async () => {
    if (!activeId) return;
    const trimmed = inputText.trim();
    if (!trimmed && pendingAttachments.length === 0) return;

    setSending(true);
    try {
      await messageService.sendMessage(activeId, {
        content: trimmed,
        reply_to_message_id: replyTo?.id || null,
        attachments: pendingAttachments,
      });

      setInputText('');
      setReplyTo(null);
      setPendingAttachments([]);
      await fetchMessages(activeId, true);
      setTimeout(scrollToBottom, 50);
      messageService.emitMessageChange();
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle File Selection for Attachments
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingAttachment(true);
    try {
      for (const file of files) {
        const uploaded = await messageService.uploadAttachment(file);
        setPendingAttachments((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      alert(`Attachment upload failed: ${err.message}`);
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  // Download Attachment
  const handleDownloadAttachment = async (att) => {
    try {
      await messageService.downloadAttachment(att.id, att.file_name);
    } catch (err) {
      alert(err.message || 'Download failed');
    }
  };

  // Remove Pending Attachment
  const removePendingAttachment = (index) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle Archive
  const handleToggleArchive = async () => {
    if (!activeConv) return;
    const newArchived = !activeConv.is_archived;
    try {
      await messageService.updateParticipantSettings(activeConv.id, { is_archived: newArchived });
      setActiveConv((prev) => ({ ...prev, is_archived: newArchived }));
      messageService.emitMessageChange();
    } catch (err) {
      alert(err.message || 'Failed to update archive status');
    }
  };

  // Toggle Star
  const handleToggleStar = async () => {
    if (!activeConv) return;
    const newStarred = !activeConv.is_starred;
    try {
      await messageService.updateParticipantSettings(activeConv.id, { is_starred: newStarred });
      setActiveConv((prev) => ({ ...prev, is_starred: newStarred }));
      messageService.emitMessageChange();
    } catch (err) {
      alert(err.message || 'Failed to star conversation');
    }
  };

  // Toggle Mute
  const handleToggleMute = async () => {
    if (!activeConv) return;
    const newMuted = !activeConv.is_muted;
    try {
      await messageService.updateParticipantSettings(activeConv.id, { is_muted: newMuted });
      setActiveConv((prev) => ({ ...prev, is_muted: newMuted }));
    } catch (err) {
      alert(err.message || 'Failed to update mute status');
    }
  };

  // Delete Message (Soft Delete)
  const handleDeleteMessage = async (msgId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await messageService.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      messageService.emitMessageChange();
    } catch (err) {
      alert(err.message || 'Failed to delete message');
    }
  };

  // Open New Message Modal & Fetch Contacts
  const handleOpenNewModal = async () => {
    setIsModalOpen(true);
    setSelectedContact(null);
    setModalTitle('');
    setModalInitialMsg('');
    setLoadingContacts(true);
    try {
      const list = await messageService.getContacts();
      setContacts(list || []);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Start Conversation from Modal
  const handleStartConversation = async () => {
    if (!selectedContact) {
      alert('Please select a recipient to start messaging.');
      return;
    }

    try {
      const payload = {
        recipient_id: selectedContact.user_id,
        type: 'DIRECT',
        title: modalTitle.trim() || null,
        student_id: selectedContact.student_id || null,
        subject_id: selectedContact.subject_id || null,
        initial_message: modalInitialMsg.trim() || 'Hello, I would like to connect.',
      };

      const res = await messageService.createOrGetConversation(payload);
      setIsModalOpen(false);
      messageService.emitMessageChange();
      if (res?.id) {
        handleSelectConversation(res.id);
      }
    } catch (err) {
      alert(err.message || 'Failed to initiate conversation');
    }
  };

  // Determine active conversation partner info
  const partner = activeConv?.participants?.find((p) => p.id !== currentUserId) || activeConv?.participants?.[0];

  // Group messages by Date
  const groupedMessages = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== lastDate) {
      groupedMessages.push({ type: 'DIVIDER', date: msg.created_at, key: `div-${msg.id}` });
      lastDate = msgDate;
    }
    groupedMessages.push({ type: 'MESSAGE', ...msg, key: msg.id });
  });

  // Collect all shared attachments in active thread
  const allAttachments = messages.flatMap((m) => m.attachments || []);

  return (
    <div className={styles.messagesContainer}>
      {/* ================= 1. LEFT PANE: INBOX ================= */}
      <div className={styles.inboxPane}>
        <div className={styles.inboxHeader}>
          <div className={styles.inboxTitleRow}>
            <h2 className={styles.inboxTitle}>
              <FaEnvelope className={styles.titleIcon} /> Messages
            </h2>
            <button
              type="button"
              className={styles.newMessageBtn}
              onClick={handleOpenNewModal}
              title="Start a new message"
            >
              <FaPlus /> New
            </button>
          </div>

          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search conversations..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.filterTabs}>
            {['ALL', 'UNREAD', 'TEACHERS', 'PARENTS', 'ARCHIVED'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTabBtn : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.threadList}>
          {loadingConversations ? (
            <div className={styles.emptyInbox}>Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className={styles.emptyInbox}>
              <FaEnvelope className={styles.emptyInboxIcon} />
              <p>No conversations found</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const other = conv.other_participants?.[0] || {};
              const isActive = conv.id === activeId;
              const hasUnread = conv.unread_count > 0;
              const partnerName = other.first_name ? `${other.first_name} ${other.last_name}` : 'School Member';

              return (
                <div
                  key={conv.id}
                  className={`${styles.threadItem} ${isActive ? styles.activeThreadItem : ''}`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className={styles.avatarCol}>
                    {other.profile_image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={other.profile_image} alt={partnerName} className={styles.avatarImg} />
                    ) : (
                      <div className={styles.avatarFallback}>
                        {partnerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={styles.onlineIndicator} />
                  </div>

                  <div className={styles.threadContent}>
                    <div className={styles.threadTopRow}>
                      <h4 className={styles.participantName}>{partnerName}</h4>
                      <span className={styles.timestamp}>
                        {formatRelativeTime(conv.last_message_at)}
                      </span>
                    </div>

                    {conv.student_context?.first_name && (
                      <div className={styles.studentContextTag}>
                        <FaGraduationCap /> {conv.student_context.first_name} ({conv.student_context.grade_name || ''})
                      </div>
                    )}

                    <div className={styles.threadBottomRow}>
                      <p className={`${styles.messageSnippet} ${hasUnread ? styles.unreadSnippet : ''}`}>
                        {conv.last_message_preview || 'No messages yet'}
                      </p>
                      {hasUnread && (
                        <span className={styles.unreadBadge}>{conv.unread_count}</span>
                      )}
                      {conv.is_starred && <FaStar className={styles.starIconActive} />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= 2. CENTER PANE: ACTIVE CHAT ================= */}
      <div className={styles.chatPane}>
        {!activeConv ? (
          <div className={styles.chatEmptyState}>
            <FaEnvelope className={styles.emptyStateIllustration} />
            <h3 className={styles.emptyStateTitle}>Your Communication Hub</h3>
            <p className={styles.emptyStateDesc}>
              Select a conversation from the left to read and send messages, or start a new inquiry with teachers and parents.
            </p>
            <button type="button" className={styles.newMessageBtn} onClick={handleOpenNewModal}>
              <FaPlus /> Start a Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className={styles.chatHeader}>
              <div className={styles.headerLeft}>
                {partner?.profile_image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={partner.profile_image} alt="Partner" className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarFallback}>
                    {(partner?.first_name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={styles.headerDetails}>
                  <h3 className={styles.headerName}>
                    {partner?.first_name ? `${partner.first_name} ${partner.last_name}` : 'Direct Conversation'}
                  </h3>
                  <div className={styles.headerSubRow}>
                    <span className={styles.headerRoleBadge}>{partner?.role || 'Staff'}</span>
                    {activeConv.student_context && (
                      <button
                        type="button"
                        className={styles.headerStudentBtn}
                        onClick={() => setIsDrawerOpen((prev) => !prev)}
                        title="View student context profile"
                      >
                        <FaUserGraduate /> Child: {activeConv.student_context.first_name} {activeConv.student_context.last_name} ({activeConv.student_context.grade_name || 'Class'})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.headerRightActions}>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${activeConv.is_starred ? styles.actionBtnActive : ''}`}
                  onClick={handleToggleStar}
                  title="Star conversation"
                >
                  {activeConv.is_starred ? <FaStar /> : <FaRegStar />}
                </button>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${activeConv.is_muted ? styles.actionBtnActive : ''}`}
                  onClick={handleToggleMute}
                  title={activeConv.is_muted ? 'Unmute' : 'Mute notifications'}
                >
                  <FaBellSlash />
                </button>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${activeConv.is_archived ? styles.actionBtnActive : ''}`}
                  onClick={handleToggleArchive}
                  title={activeConv.is_archived ? 'Unarchive' : 'Archive conversation'}
                >
                  <FaArchive />
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => fetchMessages(activeConv.id)}
                  title="Refresh messages"
                >
                  <FaSync />
                </button>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${isDrawerOpen ? styles.actionBtnActive : ''}`}
                  onClick={() => setIsDrawerOpen((prev) => !prev)}
                  title="Toggle details dossier"
                >
                  <FaInfoCircle />
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div className={styles.messagesStream}>
              {loadingMessages ? (
                <div className={styles.emptyInbox}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className={styles.emptyInbox}>
                  <p>No messages in this conversation yet. Say hello!</p>
                </div>
              ) : (
                groupedMessages.map((item) => {
                  if (item.type === 'DIVIDER') {
                    return (
                      <div key={item.key} className={styles.dateDivider}>
                        <span className={styles.dateBadge}>{formatDateDivider(item.date)}</span>
                      </div>
                    );
                  }

                  const isOutgoing = item.sender_id === currentUserId;

                  return (
                    <div
                      key={item.key}
                      className={`${styles.messageRow} ${
                        isOutgoing ? styles.messageRowOutgoing : styles.messageRowIncoming
                      }`}
                    >
                      {!isOutgoing && (
                        item.sender_profile_image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={item.sender_profile_image} alt="" className={styles.bubbleAvatar} />
                        ) : (
                          <div className={styles.bubbleAvatarFallback}>
                            {(item.sender_first_name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )
                      )}

                      <div className={styles.bubbleBody}>
                        {!isOutgoing && (
                          <span className={styles.senderLabel}>
                            {item.sender_first_name} {item.sender_last_name}
                          </span>
                        )}

                        <div className={styles.bubbleCard}>
                          {item.reply_content && (
                            <div className={styles.quotedBox}>
                              <div className={styles.quotedSender}>
                                {item.reply_sender_first_name || 'User'}
                              </div>
                              <div className={styles.quotedText}>{item.reply_content}</div>
                            </div>
                          )}

                          <div className={styles.bubbleText}>{item.content}</div>

                          {/* Attachments */}
                          {item.attachments && item.attachments.length > 0 && (
                            <div className={styles.attachmentsWrap}>
                              {item.attachments.map((att, attIdx) => (
                                <button
                                  key={att.id || `att-${attIdx}`}
                                  type="button"
                                  onClick={() => handleDownloadAttachment(att)}
                                  className={styles.attachmentCard}
                                  title={`Download ${att.file_name}`}
                                >
                                  {getFileIcon(att.file_type)}
                                  <div className={styles.attachmentInfo}>
                                    <div className={styles.attachmentName}>{att.file_name}</div>
                                    <div className={styles.attachmentSize}>{formatFileSize(att.file_size)}</div>
                                  </div>
                                  <FaDownload className={styles.downloadIcon} />
                                </button>
                              ))}
                            </div>
                          )}

                          <div className={styles.bubbleMeta}>
                            <span>
                              {new Date(item.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isOutgoing && <FaCheckDouble />}
                          </div>
                        </div>

                        {/* Hover Actions */}
                        <div className={styles.bubbleActions}>
                          <button
                            type="button"
                            className={styles.bubbleActionBtn}
                            onClick={() => setReplyTo(item)}
                            title="Reply to message"
                          >
                            <FaReply />
                          </button>
                          {isOutgoing && (
                            <button
                              type="button"
                              className={styles.bubbleActionBtn}
                              onClick={() => handleDeleteMessage(item.id)}
                              title="Delete message"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className={styles.chatComposerWrapper}>
              {replyTo && (
                <div className={styles.replyPreviewBar}>
                  <div className={styles.replyPreviewText}>
                    <strong>Replying to {replyTo.sender_first_name}:</strong> {replyTo.content.slice(0, 80)}
                  </div>
                  <button type="button" className={styles.replyCloseBtn} onClick={() => setReplyTo(null)}>
                    <FaTimes />
                  </button>
                </div>
              )}

              {pendingAttachments.length > 0 && (
                <div className={styles.pendingAttachmentsList}>
                  {pendingAttachments.map((att, idx) => (
                    <div key={idx} className={styles.pendingAttachmentChip}>
                      <FaPaperclip /> {att.file_name} ({formatFileSize(att.file_size)})
                      <button
                        type="button"
                        className={styles.removeAttachmentBtn}
                        onClick={() => removePendingAttachment(idx)}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.composerControlsRow}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  multiple
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className={styles.composerToolBtn}
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach files (PDF, images)"
                >
                  <FaPaperclip />
                </button>

                <textarea
                  className={styles.composerTextarea}
                  placeholder="Type a message (Enter to send, Shift+Enter for newline)..."
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />

                {uploadingAttachment && (
                  <div className={styles.uploadingNotice}>
                    <FaSync className={styles.spinIcon} /> Uploading attachment...
                  </div>
                )}

                <button
                  type="button"
                  className={styles.sendBtn}
                  disabled={sending || uploadingAttachment || (!inputText.trim() && pendingAttachments.length === 0)}
                  onClick={handleSendMessage}
                  title="Send Message"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ================= 3. RIGHT PANE: CONTEXT DRAWER ================= */}
      {isDrawerOpen && activeConv && (
        <div className={styles.contextDrawer}>
          <div className={styles.drawerHeader}>
            <h4 className={styles.drawerTitle}>Conversation Dossier</h4>
            <button
              type="button"
              className={styles.closeDrawerBtn}
              onClick={() => setIsDrawerOpen(false)}
            >
              <FaTimes />
            </button>
          </div>

          <div className={styles.drawerBody}>
            {activeConv.student_context ? (
              <div className={styles.studentCard}>
                <div className={styles.studentCardAvatar}>
                  <FaUserGraduate />
                </div>
                <h5 className={styles.studentCardName}>
                  {activeConv.student_context.first_name} {activeConv.student_context.last_name}
                </h5>
                <p className={styles.studentCardMeta}>
                  {activeConv.student_context.grade_name || 'Grade'} - {activeConv.student_context.section_name || 'Section'}
                </p>
                {activeConv.student_context.admission_number && (
                  <p className={styles.studentCardMeta}>
                    Adm: {activeConv.student_context.admission_number}
                  </p>
                )}
              </div>
            ) : (
              <div className={styles.studentCard}>
                <h5 className={styles.studentCardName}>Direct Communication</h5>
                <p className={styles.studentCardMeta}>General institutional dialogue</p>
              </div>
            )}

            <div>
              <h5 className={styles.drawerSectionTitle}>Shared Files ({allAttachments.length})</h5>
              {allAttachments.length === 0 ? (
                <p className={styles.studentCardMeta}>No files shared in this thread yet.</p>
              ) : (
                <div className={styles.sharedFilesList}>
                  {allAttachments.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.sharedFileItem}
                      download
                    >
                      {getFileIcon(file.file_type)}
                      <div className={styles.attachmentInfo}>
                        <div className={styles.attachmentName}>{file.file_name}</div>
                        <div className={styles.attachmentSize}>{formatFileSize(file.file_size)}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.drawerControls}>
              <button type="button" className={styles.drawerControlBtn} onClick={handleToggleStar}>
                {activeConv.is_starred ? <FaStar style={{ color: '#f59e0b' }} /> : <FaRegStar />}
                {activeConv.is_starred ? 'Starred Conversation' : 'Star Conversation'}
              </button>
              <button type="button" className={styles.drawerControlBtn} onClick={handleToggleMute}>
                <FaBellSlash /> {activeConv.is_muted ? 'Unmute Notifications' : 'Mute Notifications'}
              </button>
              <button type="button" className={styles.drawerControlBtn} onClick={handleToggleArchive}>
                <FaArchive /> {activeConv.is_archived ? 'Unarchive Thread' : 'Archive Thread'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 4. NEW CONVERSATION MODAL ================= */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Start a New Conversation"
        >
          <div className={styles.modalBody}>
            <div className={styles.modalContactSearch}>
              <label className={styles.modalLabel}>Select Recipient (Authorized Contacts)</label>
              <input
                type="text"
                placeholder="Search teacher, parent, or staff name..."
                className={styles.modalInput}
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </div>

            <div className={styles.contactDirectory}>
              {loadingContacts ? (
                <p style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                  Loading authorized contacts...
                </p>
              ) : contacts.length === 0 ? (
                <p style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                  No eligible contacts available.
                </p>
              ) : (
                contacts
                  .filter((c) => {
                    if (!contactSearch.trim()) return true;
                    const full = `${c.first_name} ${c.last_name} ${c.contact_role} ${c.subject_name || ''}`.toLowerCase();
                    return full.includes(contactSearch.trim().toLowerCase());
                  })
                  .map((c, idx) => {
                    const isSelected =
                      selectedContact?.user_id === c.user_id &&
                      selectedContact?.student_id === c.student_id &&
                      selectedContact?.subject_id === c.subject_id;
                    return (
                      <div
                        key={`contact-${c.user_id}-${c.student_id || 'general'}-${c.subject_id || 'none'}-${idx}`}
                        className={`${styles.contactItem} ${isSelected ? styles.contactItemSelected : ''}`}
                        onClick={() => setSelectedContact(c)}
                      >
                        <div className={styles.contactItemLeft}>
                          {c.profile_image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={c.profile_image} alt="" className={styles.avatarImg} />
                          ) : (
                            <div className={styles.avatarFallback}>
                              {(c.first_name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h5 className={styles.contactName}>
                              {c.first_name} {c.last_name}
                            </h5>
                            <span className={styles.contactRole}>
                              {c.contact_role} {c.subject_name ? `(${c.subject_name})` : ''}
                            </span>
                          </div>
                        </div>

                        {c.student_first_name && (
                          <span className={styles.contactStudentTag}>
                            Child: {c.student_first_name} ({c.grade_name || ''})
                          </span>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            <div className={styles.modalFieldGroup}>
              <label className={styles.modalLabel}>Subject / Topic (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Mathematics homework question, Absence excuse note..."
                className={styles.modalInput}
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
              />
            </div>

            <div className={styles.modalFieldGroup}>
              <label className={styles.modalLabel}>Initial Message</label>
              <textarea
                rows={3}
                placeholder="Write your introductory message here..."
                className={styles.modalInput}
                value={modalInitialMsg}
                onChange={(e) => setModalInitialMsg(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className={styles.actionBtn}
                style={{ width: 'auto', padding: '0 16px' }}
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.newMessageBtn}
                disabled={!selectedContact}
                onClick={handleStartConversation}
              >
                <FaPaperPlane /> Start Conversation
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
