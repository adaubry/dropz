--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public.categories (
    slug text NOT NULL,
    name text NOT NULL,
    collection_id integer NOT NULL,
    image_url text
);


ALTER TABLE public.categories OWNER TO "default";

--
-- Name: collections; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public.collections (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL
);


ALTER TABLE public.collections OWNER TO "default";

--
-- Name: collections_id_seq; Type: SEQUENCE; Schema: public; Owner: default
--

CREATE SEQUENCE public.collections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.collections_id_seq OWNER TO "default";

--
-- Name: collections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: default
--

ALTER SEQUENCE public.collections_id_seq OWNED BY public.collections.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public.products (
    slug text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    price numeric NOT NULL,
    subcategory_slug text NOT NULL,
    image_url text
);


ALTER TABLE public.products OWNER TO "default";

--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public.subcategories (
    slug text NOT NULL,
    name text NOT NULL,
    subcollection_id integer NOT NULL,
    image_url text
);


ALTER TABLE public.subcategories OWNER TO "default";

--
-- Name: subcollections; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public.subcollections (
    id integer NOT NULL,
    name text NOT NULL,
    category_slug text NOT NULL
);


ALTER TABLE public.subcollections OWNER TO "default";

--
-- Name: subcollections_id_seq; Type: SEQUENCE; Schema: public; Owner: default
--

CREATE SEQUENCE public.subcollections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subcollections_id_seq OWNER TO "default";

--
-- Name: subcollections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: default
--

ALTER SEQUENCE public.subcollections_id_seq OWNED BY public.subcollections.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO "default";

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: default
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO "default";

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: default
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: collections id; Type: DEFAULT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.collections ALTER COLUMN id SET DEFAULT nextval('public.collections_id_seq'::regclass);


--
-- Name: subcollections id; Type: DEFAULT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.subcollections ALTER COLUMN id SET DEFAULT nextval('public.subcollections_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public.categories (slug, name, collection_id, image_url) FROM stdin;
erasers	Erasers	2	https://bevgyjm5apuichhj.public.blob.vercel-storage.com/categories/erasers-VTz6b5E0ZNe2V5Gs4JjvvRGMvsWmhm
inking-pens	Inking Pens	6	https://bevgyjm5apuichhj.public.blob.vercel-storage.com/categories/inking-pens-HfWBdaqugXDFP9YtT4xdZV6xyhHPCn
charcoal	Charcoal	2	https://bevgyjm5apuichhj.public.blob.vercel-storage.com/categories/charcoal-1G6b0Yk1b5Y2R3T0bX6X1b7g3bF4
\.


--
-- Data for Name: subcollections; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public.subcollections (id, name, category_slug) FROM stdin;
\.


--
-- Data for Name: subcollections; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public.subcollections (id, name, category_slug) FROM stdin;
1	Sketching Pencils	graphite-pencils
2	Graphite Pencil Sets	graphite-pencils
3	Jumbo Graphite Pencils	graphite-pencils
4	Waterproof Painting Aprons	painting-aprons
5	Cotton Painting Aprons	painting-aprons
6	Disposable Painting Aprons	painting-aprons
7	Adjustable Painting Aprons	painting-aprons
8	Full Coverage Painting Aprons	painting-aprons
9	Pocketed Painting Aprons	painting-aprons
10	Cobbler Painting Aprons	painting-aprons
11	Sleeveless Painting Aprons	painting-aprons
\.


--
-- Name: collections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: default
--

SELECT pg_catalog.setval('public.collections_id_seq', 20, true);


--
-- Name: subcollections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: default
--

SELECT pg_catalog.setval('public.subcollections_id_seq', 5821, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: default
--

SELECT pg_catalog.setval('public.users_id_seq', 276, true);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (slug);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (slug);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (slug);


--
-- Name: subcollections subcollections_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.subcollections
    ADD CONSTRAINT subcollections_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: categories_collection_id_idx; Type: INDEX; Schema: public; Owner: default
--

CREATE INDEX categories_collection_id_idx ON public.categories USING btree (collection_id);


--
-- Name: name_search_index; Type: INDEX; Schema: public; Owner: default
--

CREATE INDEX name_search_index ON public.products USING gin (to_tsvector('english'::regconfig, name));


--
-- Name: name_trgm_index; Type: INDEX; Schema: public; Owner: default
--

CREATE INDEX name_trgm_index ON public.products USING gin (name public.gin_trgm_ops);


--
-- Name: products_subcategory_slug_idx; Type: INDEX; Schema: public; Owner: default
--

CREATE INDEX products_subcategory_slug_idx ON public.products USING btree (subcategory_slug);


--
-- Name: subcategories_subcollection_id_idx; Type: INDEX; Schema: public; Owner: default
--

CREATE INDEX subcategories_subcollection_id_idx ON public.subcategories USING btree (subcollection_id);


--
-- Name: subcollections_category_slug_idx; Type: INDEX; Schema: public; Owner: default
--

CREATE INDEX subcollections_category_slug_idx ON public.subcollections USING btree (category_slug);


--
-- Name: categories categories_collection_id_collections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_collection_id_collections_id_fk FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;


--
-- Name: products products_subcategory_slug_subcategories_slug_fk; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_subcategory_slug_subcategories_slug_fk FOREIGN KEY (subcategory_slug) REFERENCES public.subcategories(slug) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_subcollection_id_subcollections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_subcollection_id_subcollections_id_fk FOREIGN KEY (subcollection_id) REFERENCES public.subcollections(id) ON DELETE CASCADE;


--
-- Name: subcollections subcollections_category_slug_categories_slug_fk; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public.subcollections
    ADD CONSTRAINT subcollections_category_slug_categories_slug_fk FOREIGN KEY (category_slug) REFERENCES public.categories(slug) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

