--
-- PostgreSQL database dump
--

\restrict jpryX0Jm4XGLyJw6cP3HXeNNm3fnXxHTwLayXLHmcdfWAuHd2BGDl8bYpAceK9I

-- Dumped from database version 17.5 (6bc9ef8)
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-2.pgdg22.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
-- Name: planets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.planets (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL
);


ALTER TABLE public.planets OWNER TO neondb_owner;

--
-- Name: collections_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.collections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.collections_id_seq OWNER TO neondb_owner;

--
-- Name: collections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.collections_id_seq OWNED BY public.planets.id;


--
-- Name: drops; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.drops (
    slug text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    price numeric NOT NULL,
    subcategory_slug text NOT NULL,
    image_url text
);


ALTER TABLE public.drops OWNER TO neondb_owner;

--
-- Name: oceans; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.oceans (
    id integer NOT NULL,
    name text NOT NULL,
    ocean_slug text NOT NULL
);


ALTER TABLE public.oceans OWNER TO neondb_owner;

--
-- Name: rivers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rivers (
    slug text NOT NULL,
    name text NOT NULL,
    river_id integer NOT NULL,
    image_url text
);


ALTER TABLE public.rivers OWNER TO neondb_owner;

--
-- Name: seas; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.seas (
    slug text NOT NULL,
    name text NOT NULL,
    planet_id integer NOT NULL,
    image_url text
);


ALTER TABLE public.seas OWNER TO neondb_owner;

--
-- Name: subcollections_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.subcollections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subcollections_id_seq OWNER TO neondb_owner;

--
-- Name: subcollections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.subcollections_id_seq OWNED BY public.oceans.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: oceans id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.oceans ALTER COLUMN id SET DEFAULT nextval('public.subcollections_id_seq'::regclass);


--
-- Name: planets id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.planets ALTER COLUMN id SET DEFAULT nextval('public.collections_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: seas categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.seas
    ADD CONSTRAINT categories_pkey PRIMARY KEY (slug);


--
-- Name: planets collections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.planets
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: drops products_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.drops
    ADD CONSTRAINT products_pkey PRIMARY KEY (slug);


--
-- Name: rivers subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rivers
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (slug);


--
-- Name: oceans subcollections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.oceans
    ADD CONSTRAINT subcollections_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: categories_collection_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX categories_collection_id_idx ON public.seas USING btree (planet_id);


--
-- Name: name_search_index; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX name_search_index ON public.drops USING gin (to_tsvector('english'::regconfig, name));


--
-- Name: name_trgm_index; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX name_trgm_index ON public.drops USING gin (name public.gin_trgm_ops);


--
-- Name: products_subcategory_slug_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX products_subcategory_slug_idx ON public.drops USING btree (subcategory_slug);


--
-- Name: subcategories_subcollection_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX subcategories_subcollection_id_idx ON public.rivers USING btree (river_id);


--
-- Name: subcollections_category_slug_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX subcollections_category_slug_idx ON public.oceans USING btree (ocean_slug);


--
-- Name: seas categories_collection_id_collections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.seas
    ADD CONSTRAINT categories_collection_id_collections_id_fk FOREIGN KEY (planet_id) REFERENCES public.planets(id) ON DELETE CASCADE;


--
-- Name: drops products_subcategory_slug_subcategories_slug_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.drops
    ADD CONSTRAINT products_subcategory_slug_subcategories_slug_fk FOREIGN KEY (subcategory_slug) REFERENCES public.rivers(slug) ON DELETE CASCADE;


--
-- Name: rivers subcategories_subcollection_id_subcollections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rivers
    ADD CONSTRAINT subcategories_subcollection_id_subcollections_id_fk FOREIGN KEY (river_id) REFERENCES public.oceans(id) ON DELETE CASCADE;


--
-- Name: oceans subcollections_category_slug_categories_slug_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.oceans
    ADD CONSTRAINT subcollections_category_slug_categories_slug_fk FOREIGN KEY (ocean_slug) REFERENCES public.seas(slug) ON DELETE CASCADE;


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

\unrestrict jpryX0Jm4XGLyJw6cP3HXeNNm3fnXxHTwLayXLHmcdfWAuHd2BGDl8bYpAceK9I

