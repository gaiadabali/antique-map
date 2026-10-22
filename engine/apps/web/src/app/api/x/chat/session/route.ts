// The visitor opens (POST) or deletes (DELETE) the chat — AI.md §1; the handlers are src/server/chat.
export {
  chatSessionDelete as DELETE,
  chatSessionPost as POST,
} from '../../../../../server/chat/routes'
