export type ChatMessage = {
  id: string;
  sender: "client" | "admin";
  content: string;
  timestamp: string;
};

export type MessageThread = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  channel: "contact_form" | "instagram_dm" | "reservation";
  status: "new" | "open" | "replied";
  unreadCount: number;
  updatedAt: string;
  location: string;
  sourceLabel?: string;
  messages: ChatMessage[];
};

export const mockMessageThreads: MessageThread[] = [
  {
    id: "msg-001",
    name: "Isabella Conti",
    email: "isabella.conti@example.com",
    subject: "Birthday dinner for 12 guests",
    channel: "reservation",
    status: "new",
    unreadCount: 2,
    updatedAt: "2026-04-20T20:55:00Z",
    location: "Olbia",
    messages: [
      {
        id: "msg-001-1",
        sender: "client",
        content: "Hi, I would love to reserve a sunset table for 12 people on Friday. Do you offer a set menu for larger groups?",
        timestamp: "2026-04-20T19:10:00Z",
      },
      {
        id: "msg-001-2",
        sender: "client",
        content: "We are also celebrating a birthday, so if there is a dessert option I would love to arrange it in advance.",
        timestamp: "2026-04-20T20:55:00Z",
      },
    ],
  },
  {
    id: "msg-002",
    name: "Daniel Brooks",
    email: "daniel.brooks@example.com",
    subject: "Lost sunglasses after dinner",
    channel: "contact_form",
    status: "open",
    unreadCount: 1,
    updatedAt: "2026-04-20T14:24:00Z",
    location: "London",
    messages: [
      {
        id: "msg-002-1",
        sender: "client",
        content: "Hello, I visited yesterday and I think I left a pair of black sunglasses at the terrace bar. Could you check?",
        timestamp: "2026-04-20T13:48:00Z",
      },
      {
        id: "msg-002-2",
        sender: "admin",
        content: "Thanks Daniel, we are checking with the floor team and will get back to you shortly.",
        timestamp: "2026-04-20T14:12:00Z",
      },
      {
        id: "msg-002-3",
        sender: "client",
        content: "Thank you. They have a small gold mark on the left arm if that helps identify them.",
        timestamp: "2026-04-20T14:24:00Z",
      },
    ],
  },
  {
    id: "msg-003",
    name: "Chiara Neri",
    email: "chiara.neri@example.com",
    subject: "Private sunset event",
    channel: "instagram_dm",
    status: "replied",
    unreadCount: 0,
    updatedAt: "2026-04-19T17:08:00Z",
    location: "Cagliari",
    messages: [
      {
        id: "msg-003-1",
        sender: "client",
        content: "Ciao, do you host small private events on the beach area in late June?",
        timestamp: "2026-04-19T15:42:00Z",
      },
      {
        id: "msg-003-2",
        sender: "admin",
        content: "Yes, we do. Please share your preferred date, guest count and whether you need food service, and we can prepare options for you.",
        timestamp: "2026-04-19T17:08:00Z",
      },
    ],
  },
  {
    id: "msg-004",
    name: "Julia Hoff",
    email: "julia.hoff@example.com",
    subject: "Vegetarian tasting request",
    channel: "contact_form",
    status: "new",
    unreadCount: 3,
    updatedAt: "2026-04-18T21:06:00Z",
    location: "Berlin",
    messages: [
      {
        id: "msg-004-1",
        sender: "client",
        content: "Hi, we are visiting next week and I wanted to ask if you can prepare a vegetarian tasting-style dinner for two.",
        timestamp: "2026-04-18T18:36:00Z",
      },
      {
        id: "msg-004-2",
        sender: "client",
        content: "We love seafood-themed presentation, but without fish of course. The visual style of your place is exactly what we want.",
        timestamp: "2026-04-18T19:15:00Z",
      },
      {
        id: "msg-004-3",
        sender: "client",
        content: "If possible, we would prefer a table around 20:00.",
        timestamp: "2026-04-18T21:06:00Z",
      },
    ],
  },
];
