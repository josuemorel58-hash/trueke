export const categories = [
  "Ropa",
  "Libros",
  "Herramientas",
  "Hogar",
  "Juguetes",
  "Otros",
] as const;
export type Category = (typeof categories)[number];
export type Item = {
  id: string;
  title: string;
  category: Category;
  distance: number;
  condition: "Nuevo" | "Usado";
  owner: string;
  mine: boolean;
  photo: string;
};
export type SharedLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
};
export type Profile = {
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  coordinates: SharedLocation | null;
  location: string;
  bio: string;
  photo: string;
};
export type Message = { id: string; text: string; mine: boolean; date: string };
export type LocalData = {
  version: 1;
  signedIn: boolean;
  profile: Profile;
  items: Item[];
  messages: Message[];
  history: { id: string; title: string; date: string }[];
  nearbyOnly: boolean;
  favorites: string[];
};
export const initialData: LocalData = {
  version: 1,
  signedIn: false,
  nearbyOnly: false,
  favorites: [],
  profile: {
    name: "Alex",
    firstName: "",
    lastName: "",
    phone: "",
    coordinates: null,
    location: "Puerto Plata",
    bio: "Creo en las segundas oportunidades. Intercambiemos algo que nos haga falta.",
    photo: "",
  },
  items: [
    {
      id: "1",
      title: "Camisa de lino",
      category: "Ropa",
      distance: 0.8,
      condition: "Usado",
      owner: "María",
      mine: false,
      photo:
        "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=700",
    },
    {
      id: "2",
      title: "Libros para una nueva aventura",
      category: "Libros",
      distance: 1.2,
      condition: "Usado",
      owner: "Carlos",
      mine: false,
      photo:
        "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=700",
    },
    {
      id: "3",
      title: "Kit de herramientas",
      category: "Herramientas",
      distance: 2.4,
      condition: "Nuevo",
      owner: "Luisa",
      mine: false,
      photo:
        "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=700",
    },
    {
      id: "4",
      title: "Silla de madera",
      category: "Hogar",
      distance: 0,
      condition: "Usado",
      owner: "Alex",
      mine: true,
      photo:
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=700",
    },
    {
      id: "5",
      title: "Bicicleta para explorar",
      category: "Otros",
      distance: 3.1,
      condition: "Usado",
      owner: "Diego",
      mine: false,
      photo:
        "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=700",
    },
  ],
  messages: [
    {
      id: "welcome",
      text: "¡Hola! ¿Todavía tienes la silla? Me gustaría intercambiarla por unos libros.",
      mine: false,
      date: "2026-10-10T15:00:00Z",
    },
  ],
  history: [],
};
