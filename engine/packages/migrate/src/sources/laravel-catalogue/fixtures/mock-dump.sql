-- MySQL dump 10.13  Distrib 5.7.42, for Linux (x86_64)
--
-- Host: localhost    Database: legacy_catalogue
-- ------------------------------------------------------
-- Server version	5.7.42-0ubuntu0.18.04.1
--
-- MOCK FIXTURE (TASKS.md 7.1.f, D42). A synthetic, Laravel-shaped catalogue
-- dump standing in for the owner's export (OA9) until it is handed over.
-- Every row is invented: the people are fictional, every address is at
-- example.invalid, every password column holds a placeholder that is not a
-- hash of anything. The rows carry the dirty data MIGRATION.md §4 lists
-- (see ../README.md for the case-by-row index). Plain mysqldump output with
-- no CREATE DATABASE / USE, as a host usually hands one over.

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2014_10_12_000000_create_users_table',1),(2,'2014_10_12_100000_create_password_resets_table',1),(3,'2018_09_01_000000_create_categories_table',1),(4,'2018_09_01_000100_create_mapmakers_table',1),(5,'2018_09_01_000200_create_products_table',1),(6,'2018_09_01_000300_create_product_images_table',1),(7,'2018_09_01_000400_create_category_product_table',1),(8,'2018_10_01_000000_create_orders_table',2),(9,'2018_10_01_000100_create_order_items_table',2),(10,'2019_02_01_000000_create_wishlists_table',3),(11,'2019_02_01_000100_create_product_requests_table',3),(12,'2019_06_01_000000_create_newsletter_subscribers_table',4),(13,'2021_07_20_000000_create_pages_table',5);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `city` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Mock Customer One','customer.one@example.invalid','+000 0000 0001','1 Example Lane','Testville','SG','2019-03-02 08:00:00','MOCK-PASSWORD-PLACEHOLDER-NOT-A-HASH','MOCK-REMEMBER-TOKEN-1',0,'2019-03-01 08:00:00','2022-11-04 10:12:00'),(2,'Mock Customer Two','customer.two@example.invalid',NULL,'2 Sample Road\nUnit 3','Exampleton','ID',NULL,'MOCK-PASSWORD-PLACEHOLDER-NOT-A-HASH',NULL,0,'2020-06-15 12:30:00','2020-06-15 12:30:00'),(3,'Mock Customer Three','customer.three@example.invalid','+000 0000 0003',NULL,NULL,'AU','2021-01-10 09:00:00','MOCK-PASSWORD-PLACEHOLDER-NOT-A-HASH',NULL,0,'2021-01-09 09:00:00','2021-01-10 09:00:00'),(4,'Mock Customer O\'Four','customer.four@example.invalid',NULL,'4 Placeholder Street','Nowhere','NL',NULL,'MOCK-PASSWORD-PLACEHOLDER-NOT-A-HASH',NULL,0,'2022-08-20 18:45:00','2022-08-20 18:45:00'),(5,'Mock Staff Admin','staff.admin@example.invalid',NULL,NULL,NULL,'ID','2018-09-07 10:00:00','MOCK-PASSWORD-PLACEHOLDER-NOT-A-HASH','MOCK-REMEMBER-TOKEN-5',1,'2018-09-07 10:00:00','2023-01-01 00:00:00');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_resets` (
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  KEY `password_resets_email_index` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `password_resets` WRITE;
/*!40000 ALTER TABLE `password_resets` DISABLE KEYS */;
INSERT INTO `password_resets` VALUES ('customer.two@example.invalid','MOCK-RESET-TOKEN-PLACEHOLDER','2022-05-05 05:05:05');
/*!40000 ALTER TABLE `password_resets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` int(10) unsigned NOT NULL DEFAULT '0',
  `active` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `visible` enum('visible','hidden') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'visible',
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int(11) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `categories_parent_id_index` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,0,'active','visible','all-antique-maps','Antique Maps',1,'2018-09-07 10:35:42','2021-07-25 23:44:29'),(2,0,'active','visible','antique-prints','Antique Prints',2,'2018-09-07 10:36:00','2021-07-25 23:44:29'),(3,0,'active','visible','antique-books','Antique Books',3,'2018-09-07 10:36:10','2021-07-25 23:44:29'),(4,1,'active','visible','asia','Asia Maps',1,'2018-09-07 10:40:30','2021-07-23 08:15:39'),(5,4,'active','visible','south-east-asia','South East Asia Maps',1,'2018-09-07 10:40:42','2021-07-25 23:14:18'),(15,0,'active','visible','antique-prints-posters','Posters',4,'2018-09-07 10:41:00','2021-07-25 23:44:29'),(22,4,'active','visible','indonesia','Indonesia Maps',2,'2018-09-07 10:42:00','2021-07-25 23:14:18'),(23,5,'active','visible','malaysia-singapore','Singapore & Malaysia Maps',2,'2018-09-07 10:42:30','2021-07-25 23:14:18'),(30,5,'active','visible','india-sri-lanka','India & Sri Lanka',3,'2018-09-07 10:43:00','2021-07-25 23:14:18'),(31,1,'active','visible','pre-1700-maps','Pre-1750 Maps',9,'2018-09-07 10:43:30','2021-07-25 23:14:18'),(32,1,'active','visible','australia','Australia Maps',5,'2018-09-07 10:44:00','2021-07-25 23:14:18'),(40,1,'active','visible','sea-charts','Sea Charts',6,'2018-09-07 10:45:00','2021-07-25 23:14:18'),(44,22,'active','visible','antique-maps-java','Java Maps',1,'2018-09-07 10:46:00','2021-07-25 23:14:18'),(45,22,'active','visible','antique-maps-sumatra','Sumatra Maps',2,'2018-09-07 10:46:10','2021-07-25 23:14:18'),(46,22,'active','visible','antique-maps-bali','Bali Maps',3,'2018-09-07 10:46:20','2021-07-25 23:14:18'),(47,22,'active','visible','antique-maps-borneo','Borneo & Kalimantan Maps',4,'2018-09-07 10:46:30','2021-07-25 23:14:18'),(48,22,'active','visible','antique-maps-sulawesi','Sulawesi Maps',5,'2018-09-07 10:46:40','2021-07-25 23:14:18'),(49,22,'active','visible','moluccas-spice-islands','Moluccas & Spice Islands Maps',6,'2018-09-07 10:46:50','2021-07-25 23:14:18'),(50,22,'active','visible','new-guinea','New Guinea Maps',7,'2018-09-07 10:47:00','2021-07-25 23:14:18'),(51,5,'active','visible','philippines','Philippines Maps',4,'2018-09-07 10:47:10','2021-07-25 23:14:18'),(52,4,'active','visible','china','China Maps',3,'2018-09-07 10:47:20','2021-07-25 23:14:18'),(55,0,'active','visible','antique-photographs','Antique Photographs',5,'2018-09-07 10:48:00','2021-07-25 23:44:29'),(56,55,'active','visible','singapore-photographs','Singapore Photographs',1,'2018-09-07 10:48:10','2021-07-25 23:44:29'),(60,2,'active','visible','botanical','Botanical',1,'2018-09-07 10:49:00','2021-07-25 23:44:29'),(61,60,'active','visible','leaves','Leaves Prints',1,'2018-09-07 10:49:10','2021-07-25 23:44:29'),(62,2,'active','visible','mammal-prints','Mammal Prints',2,'2018-09-07 10:49:20','2021-07-25 23:44:29'),(63,2,'active','visible','mammals-prints','Mammals Prints',3,'2019-04-02 14:00:00','2021-07-25 23:44:29'),(64,2,'active','visible','temples-indonesia','Temples in Indonesia Prints',4,'2018-09-07 10:49:40','2021-07-25 23:44:29'),(65,2,'active','visible','wayang','Wayang',5,'2018-09-07 10:49:50','2021-07-25 23:44:29'),(66,2,'active','visible','batik','Batik',6,'2018-09-07 10:50:00','2021-07-25 23:44:29'),(67,2,'active','visible','buitenzorg','Buitenzorg',7,'2018-09-07 10:50:10','2021-07-25 23:44:29'),(68,2,'active','visible','spices','Spices',8,'2018-09-07 10:50:20','2021-07-25 23:44:29'),(70,2,'active','visible','captain-cooks-voyages','Captain Cooks Voyages',9,'2018-09-07 10:50:30','2021-07-25 23:44:29'),(71,1,'active','visible','indian-ocean','Indian Ocean Maps',7,'2018-09-07 10:50:40','2021-07-25 23:14:18'),(72,1,'active','visible','world-maps','World Maps',8,'2018-09-07 10:50:50','2021-07-25 23:14:18'),(73,1,'active','visible','voc-maps','VOC Maps',10,'2018-09-07 10:51:00','2021-07-25 23:14:18'),(94,0,'active','visible','tribal-ethnographic-art','Tribal & Ethnographic Art',6,'2020-02-02 10:00:00','2021-07-25 23:44:29'),(97,0,'active','visible','special-objects','Special Collection',7,'2020-02-02 10:10:00','2021-07-25 23:44:29'),(98,2,'inactive','hidden','old-test-category','Old Test Category',99,'2018-09-07 10:52:00','2019-01-01 00:00:00');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mapmakers`
--

DROP TABLE IF EXISTS `mapmakers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mapmakers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `mapmakers` WRITE;
/*!40000 ALTER TABLE `mapmakers` DISABLE KEYS */;
INSERT INTO `mapmakers` VALUES (3,'Theodore De Bry','theodore-de-bry','2018-09-07 11:00:00','2018-09-07 11:00:00'),(7,'Francois Valentijn','francois-valentijn','2018-09-07 11:00:10','2018-09-07 11:00:10'),(8,'Francois Valentyn','francois-valentyn','2019-05-05 09:00:00','2019-05-05 09:00:00'),(12,'Jan Huygen van Linschoten','jan-huygen-van-linschoten','2018-09-07 11:00:20','2018-09-07 11:00:20'),(20,'Willem Blaeu','willem-blaeu','2018-09-07 11:00:30','2018-09-07 11:00:30'),(25,'Jacques Nicolas Bellin','jacques-nicolas-bellin','2018-09-07 11:00:40','2018-09-07 11:00:40'),(83,'John Payne','john-payne','2018-09-07 11:00:50','2018-09-07 11:00:50'),(90,'Isaak Tirion','isaak-tirion','2018-09-07 11:01:00','2018-09-07 11:01:00'),(101,'Unknown','unknown','2018-09-07 11:01:10','2018-09-07 11:01:10'),(110,'Woodbury & Page','woodbury-page','2018-09-07 11:01:20','2018-09-07 11:01:20'),(120,'Pieter van der Aa','pieter-van-der-aa','2018-09-07 11:01:30','2018-09-07 11:01:30');
/*!40000 ALTER TABLE `mapmakers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `mapmaker_id` int(10) unsigned DEFAULT NULL,
  `sku` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_title` text COLLATE utf8mb4_unicode_ci,
  `publisher` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publication_place` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condition` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `technique` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` longtext COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) DEFAULT NULL,
  `price_on_request` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('listed','unlisted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unlisted',
  `is_sold` tinyint(1) NOT NULL DEFAULT '0',
  `sold_at` datetime DEFAULT NULL,
  `views` int(10) unsigned NOT NULL DEFAULT '0',
  `acquisition_cost` decimal(10,2) DEFAULT NULL,
  `consignor` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `products_mapmaker_id_index` (`mapmaker_id`),
  KEY `products_sku_index` (`sku`)
) ENGINE=InnoDB AUTO_INCREMENT=2091 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1001,20,'M.0001','Southeast Asia map - Year 1661','southeast-asia-map-year-1661','India quae Orientalis dicitur et insulae adiacentes (mock title)','Blaeu','Amsterdam','1661','45 by 38 cm.','Original hand colour','G+ / Study images carefully','Engraving','<p>A mock description of a seventeenth-century map of the region, written for the fixture.</p>',1850.00,0,'listed',1,'2023-02-11 09:30:00',412,900.00,NULL,'2018-10-01 10:00:00','2023-02-11 09:30:00',NULL),(1009,120,'M.0103','Indian Ocean navigational VOC sea chart - Year 1689','indian-ocean-navigational-voc-sea-chart-year-1689','Nieuwe Pascaert van Oost Indien (mock title)','Van der Aa','Leiden','1689','450 x 380 mm','','VG','Engraving','<p>A mock sea chart carrying sixteen category tags, as one real chart does.</p>',38800.00,0,'listed',0,NULL,1290,NULL,'Mock Consignor BV','2018-10-02 10:00:00','2024-01-05 08:00:00',NULL),(1015,NULL,'M.0215','Asia Dutch map, ca.1690-1700','asia-dutch-map-ca1690-1700',NULL,NULL,'Amsterdam','ca. 1690-1700','23x17cm',NULL,'G','Engraving','<p>Maker unknown; the fixture leaves mapmaker_id empty.</p>',NULL,1,'listed',0,NULL,33,NULL,NULL,'2018-10-03 10:00:00','2018-10-03 10:00:00',NULL),(1044,7,'M.Dav5','Kaart van het Eyland Bali - Extremely rare map','kaart-van-het-eyland-bali-extremely-rare-map','Kaart van het Eyland Bali (mock title)','Valentijn','Dordrecht / Amsterdam','1726','40 b7 22 cm.','Black and White','G+ / Study image carefully','Engraving','<p>A mock description with an inline reference.</p><p>( Ref: Tooley, R.V. (Australia) 1268. )</p>',NULL,1,'listed',0,NULL,875,NULL,NULL,'2018-10-04 10:00:00','2022-03-03 03:03:03',NULL),(1101,3,'M.1044','Nova tabula insularum Iavae et Sumatrae by Theodore De Bry','nova-tabula-insularum-iavae-et-sumatrae-by-theodore-de-bry','Nova tabula insularum Iavae, Sumatrae et aliarum (mock title)','De Bry','Frankfurt','1598','45 by 38 cm.',NULL,'G+ / Study images carefully','Engraving','<p>A mock late sixteenth-century map (Ref: Tiele 1234) with a second reference ( Ref: Schilder 42. ) in one paragraph.</p>',NULL,1,'listed',0,NULL,2210,NULL,NULL,'2018-10-05 10:00:00','2023-06-06 06:06:06',NULL),(1200,8,'M.0300','Map of the Moluccas - Year 1725','map-of-the-moluccas-year-1725','Nieuwe Kaart der Molukse Eilanden (mock title)','Valentyn','Amsterdam','1725','31 by 20 cm.','Original colour','VG-','Engraving','<p>Same maker as 1044, spelt Valentyn: a maker alias for the de-duplication review.</p>',2400.00,0,'listed',1,'2021-09-09 09:09:09',640,1100.00,NULL,'2018-10-06 10:00:00','2021-09-09 09:09:09',NULL),(1250,101,'M.0310','Plan of Hobart Town, Tasmania','plan-of-hobart-town-tasmania',NULL,NULL,'London','1850','28 x 21 cm',NULL,'G','Lithograph','<p>A Tasmania plan filed under Indonesia Maps, a taxonomy defect the new model fixes.</p>',650.00,0,'listed',0,NULL,51,NULL,NULL,'2018-10-07 10:00:00','2018-10-07 10:00:00',NULL),(1300,25,'M.0400','Chart of the Sunda Strait','chart-of-the-sunda-strait','Carte du Detroit de la Sonde (mock title)','Bellin','Paris',NULL,'52 by 41 cm.','Original hand colour','G','Engraving','<p>Year left NULL: the old cards print \"Year: null\".</p>',980.00,0,'listed',0,NULL,77,NULL,NULL,'2018-10-08 10:00:00','2018-10-08 10:00:00',NULL),(1301,25,'M.0401','Carte de l\'Isle de Java','carte-de-lisle-de-java',NULL,'Bellin','','Leiden','210 x 160 mm','','G','Engraving','<p>A place typed into the year field.</p>',1200.00,0,'listed',0,NULL,64,NULL,NULL,'2018-10-09 10:00:00','2018-10-09 10:00:00',NULL),(1302,90,'M.0402','Kaart der Oost-Indische Eilanden','kaart-der-oost-indische-eilanden',NULL,'Tirion','Amsterdam','null','36,5 by 28 cm.','Coloured','G / minor repair to centre fold','Engraving','<p>The year field holds the text null, and the size a decimal comma.</p>',1450.00,0,'listed',0,NULL,91,NULL,NULL,'2018-10-10 10:00:00','2018-10-10 10:00:00',NULL),(1350,83,'M.0459','East Indies from the best authorities','east-indies-from-the-best-authorities',NULL,'Payne','England','1798','31 by 20 cm.','Black and White','G','Engraving','<p>Sold with no price recorded.</p>',NULL,0,'listed',1,'2020-12-12 12:12:12',300,NULL,NULL,'2018-10-11 10:00:00','2020-12-12 12:12:12',NULL),(1400,20,'M.0500','Pre-1750 world map','pre-1750-world-map','Nova totius terrarum orbis tabula (mock title)','Blaeu','Amsterdam','1630','41 by 55 cm.','Original hand colour','VG','Engraving','<p>Filed under a category whose slug says 1700 and whose name says 1750.</p>',5200.00,0,'listed',0,NULL,150,NULL,NULL,'2018-10-12 10:00:00','2018-10-12 10:00:00',NULL),(1450,12,'M.0510','India and Ceylon','india-and-ceylon',NULL,'Linschoten','Amsterdam','1596','39 x 52 cm.','Black and White','G+','Engraving','<p>Filed under India & Sri Lanka, which sits under South East Asia.</p>',3100.00,0,'listed',0,NULL,88,NULL,NULL,'2018-10-13 10:00:00','2018-10-13 10:00:00',NULL),(1500,NULL,'P.0120','View of Batavia - Captain Cook\'s voyages - Year 1784','view-of-batavia-captain-cooks-voyages-year-1784',NULL,'Hogg','London','1784','18 x 24 cm.','Black and White','G','Copper engraving','<p>From the Cook voyage editions: a curated collection, not a facet.</p>',420.00,0,'listed',0,NULL,45,NULL,NULL,'2018-10-14 10:00:00','2018-10-14 10:00:00',NULL),(1600,NULL,'P.0231','Nutmeg (Myristica fragrans) - Botanical print - Year 1850','nutmeg-myristica-fragrans-botanical-print-year-1850',NULL,NULL,'Leiden','1850','24 by 16 cm.','Original hand colour','VG','Lithograph','<p>A spice print with a botanical name in its title.</p>',380.00,0,'listed',0,NULL,60,NULL,NULL,'2019-01-01 10:00:00','2019-01-01 10:00:00',NULL),(1601,NULL,'P.0232','Orang utan - Mammal print','orang-utan-mammal-print',NULL,NULL,'Paris','1830','22 by 14 cm.','Original hand colour','G','Engraving','<p>Filed under Mammal Prints.</p>',290.00,0,'listed',0,NULL,20,NULL,NULL,'2019-01-02 10:00:00','2019-01-02 10:00:00',NULL),(1602,NULL,'P.0233','Babirusa - Mammals print','babirusa-mammals-print',NULL,NULL,'Paris','1830','22 by 14 cm.','Original hand colour','G','Engraving','<p>Filed under Mammals Prints, the duplicate category.</p>',310.00,0,'listed',0,NULL,18,NULL,NULL,'2019-01-03 10:00:00','2019-01-03 10:00:00',NULL),(1603,NULL,'P.0234','Borobudur temple relief','borobudur-temple-relief',NULL,NULL,'The Hague','1874','30 by 44 cm.','','Good, some foxing in the margins','Albumen print','<p>Condition typed freehand.</p>',540.00,0,'listed',0,NULL,70,NULL,NULL,'2019-01-04 10:00:00','2019-01-04 10:00:00',NULL),(1604,NULL,'P.0235','Wayang kulit figures','wayang-kulit-figures',NULL,NULL,'Batavia','ca. 1880','19 x 27 cm','Chromolithograph colours','G+ / Study images carefully','Chromolithograph','<p>A theme category print.</p>',350.00,0,'listed',0,NULL,33,NULL,NULL,'2019-01-05 10:00:00','2019-01-05 10:00:00',NULL),(1605,NULL,'P.0236','Batik patterns plate','batik-patterns-plate',NULL,NULL,'Haarlem','1900','25 by 33 cm.',NULL,'G','Chromolithograph','<p>Unlisted: never shown online, only in the export.</p>',200.00,0,'unlisted',0,NULL,0,80.00,NULL,'2019-01-06 10:00:00','2019-01-06 10:00:00',NULL),(1606,NULL,'P.0237','Buitenzorg palace gardens','buitenzorg-palace-gardens',NULL,NULL,'Amsterdam','1865','20 x 28 cm.','Tinted','VG','Lithograph','<p>Sold.</p>',460.00,0,'listed',1,'2024-04-04 04:04:04',120,NULL,NULL,'2019-01-07 10:00:00','2024-04-04 04:04:04',NULL),(1700,110,'F.0012','Singapore harbour, albumen print','singapore-harbour-albumen-print',NULL,'Woodbury & Page','Batavia','ca. 1870','26 x 20 cm.','','VG','Albumen print','<p>A photograph by a studio.</p>',1650.00,0,'listed',0,NULL,99,NULL,NULL,'2019-02-01 10:00:00','2019-02-01 10:00:00',NULL),(1701,NULL,'F.0013','Batavia street scene','batavia-street-scene',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Silver gelatin print',NULL,NULL,0,'unlisted',0,NULL,0,NULL,NULL,'2019-02-02 10:00:00','2019-02-02 10:00:00',NULL),(1800,NULL,'P.0900','KPM shipping line poster','kpm-shipping-line-poster',NULL,NULL,'Amsterdam','1930','100 x 62 cm','Original colours','G / linen backed','Lithograph','<p>A poster.</p>',2750.00,0,'listed',0,NULL,40,NULL,NULL,'2019-03-01 10:00:00','2019-03-01 10:00:00',NULL),(1850,7,'P.1001','Oud en Nieuw Oost-Indien, volume III','oud-en-nieuw-oost-indien-volume-iii',NULL,'Van Braam','Dordrecht / Amsterdam','1724-1726','folio',NULL,'G','Letterpress and engravings','<p>A book, price on request.</p>',0.00,1,'listed',0,NULL,58,NULL,NULL,'2019-03-02 10:00:00','2019-03-02 10:00:00',NULL),(1900,20,'M.0700','Deleted duplicate listing','deleted-duplicate-listing',NULL,NULL,'Amsterdam','1650','45 by 38 cm.',NULL,'G','Engraving','<p>Soft-deleted.</p>',900.00,0,'listed',0,NULL,2,NULL,NULL,'2019-04-01 10:00:00','2019-04-02 10:00:00','2019-04-02 10:00:00'),(1950,NULL,'M.0701','Bali Island Dutch map - Year 1849','bali-island-dutch-map-year-1849',NULL,NULL,'Amsterdam','1849','29 by 22 cm.','Black and White','G','Lithograph','<p>Sold; its sold_at is a MySQL zero date.</p>',395.00,0,'listed',1,'0000-00-00 00:00:00',210,NULL,NULL,'2019-05-01 10:00:00','2019-05-01 10:00:00',NULL),(2000,20,'M.0702','Sumatra - antique map by Blaeu - Year 1640 - Extremely rare map','sumatra-antique-map-by-blaeu-year-1640-extremely-rare-map',NULL,'Blaeu','Amsterdam','1640','38 by 50 cm.','Original hand colour','VG','Engraving','<p>Two SEO suffixes in one title.</p>',4200.00,0,'unlisted',0,NULL,0,NULL,NULL,'2020-01-01 10:00:00','2020-01-01 10:00:00',NULL),(2050,NULL,'M.0800','Tribal textile fragment','tribal-textile-fragment',NULL,NULL,NULL,'20th century','120 x 45 cm',NULL,NULL,NULL,'<p>Tribal art, price on request.</p>',NULL,1,'listed',0,NULL,7,NULL,NULL,'2020-02-02 10:00:00','2020-02-02 10:00:00',NULL),(2090,7,'M.Dav12','Kaart van Amboína en de Banda-eilanden','kaart-van-amboina-en-de-banda-eilanden','Nieuwe Kaart van Amboina — de Banda Eilanden (mock title)','Valentijn','Dordrecht / Amsterdam','1724','51 by 39,5 cm.','Original hand colour','G+ / Study images carefully','Engraving','<p>Text that exercises the restore: a quote \' a double quote \" a backslash \\ and\na line break, an em dash — and non-Latin script 香料群島 for utf8mb4.</p>\n<p>( Ref: Tooley, R.V. (Australia) 1268. ) and (Ref: Koeman, Atlantes Neerlandici, Val 1.)</p>',7600.00,0,'listed',0,NULL,305,3000.00,NULL,'2020-03-03 10:00:00','2025-01-01 10:00:00',NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_images` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int(10) unsigned NOT NULL,
  `filename` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int(11) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_images_product_id_index` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3032 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
INSERT INTO `product_images` VALUES (3001,1001,'1001-3001.jpg',0,'2018-10-01 10:00:00','2018-10-01 10:00:00'),(3002,1001,'1001-3002.jpg',1,'2018-10-01 10:00:00','2018-10-01 10:00:00'),(3003,1009,'1009-3003.jpg',0,'2018-10-02 10:00:00','2018-10-02 10:00:00'),(3004,1015,'1015-3004.jpg',0,'2018-10-03 10:00:00','2018-10-03 10:00:00'),(3005,1044,'1044-3005.jpg',0,'2018-10-04 10:00:00','2018-10-04 10:00:00'),(3006,1044,'1044-3006.jpg',1,'2018-10-04 10:00:00','2018-10-04 10:00:00'),(3007,1044,'1044-3007.jpg',2,'2018-10-04 10:00:00','2018-10-04 10:00:00'),(3008,1101,'1101-3008.jpg',0,'2018-10-05 10:00:00','2018-10-05 10:00:00'),(3009,1200,'1200-3009.jpg',0,'2018-10-06 10:00:00','2018-10-06 10:00:00'),(3010,1250,'1250-3010.jpg',0,'2018-10-07 10:00:00','2018-10-07 10:00:00'),(3011,1300,'1300-3011.jpg',0,'2018-10-08 10:00:00','2018-10-08 10:00:00'),(3012,1301,'1301-3012.jpg',0,'2018-10-09 10:00:00','2018-10-09 10:00:00'),(3013,1302,'1302-3013.jpg',0,'2018-10-10 10:00:00','2018-10-10 10:00:00'),(3014,1350,'1350-3014.jpg',0,'2018-10-11 10:00:00','2018-10-11 10:00:00'),(3015,1400,'1400-3015.jpg',0,'2018-10-12 10:00:00','2018-10-12 10:00:00'),(3016,1450,'1450-3016.jpg',0,'2018-10-13 10:00:00','2018-10-13 10:00:00'),(3017,1500,'1500-3017.jpg',0,'2018-10-14 10:00:00','2018-10-14 10:00:00'),(3018,1600,'1600-3018.jpg',0,'2019-01-01 10:00:00','2019-01-01 10:00:00'),(3019,1601,'1601-3019.jpg',0,'2019-01-02 10:00:00','2019-01-02 10:00:00'),(3020,1602,'1602-3020.jpg',0,'2019-01-03 10:00:00','2019-01-03 10:00:00'),(3021,1603,'1603-3021.jpg',0,'2019-01-04 10:00:00','2019-01-04 10:00:00'),(3022,1604,'1604-3022.jpg',0,'2019-01-05 10:00:00','2019-01-05 10:00:00'),(3023,1605,'1605-3023.jpg',0,'2019-01-06 10:00:00','2019-01-06 10:00:00'),(3024,1606,'1606-3024.jpg',0,'2019-01-07 10:00:00','2019-01-07 10:00:00'),(3025,1700,'1700-3025.jpg',0,'2019-02-01 10:00:00','2019-02-01 10:00:00'),(3026,1800,'1800-3026.jpg',0,'2019-03-01 10:00:00','2019-03-01 10:00:00'),(3027,1850,'1850-3027.jpg',0,'2019-03-02 10:00:00','2019-03-02 10:00:00'),(3028,1950,'1950-3028.jpg',0,'2019-05-01 10:00:00','2019-05-01 10:00:00'),(3029,2000,'2000-3029.jpg',0,'2020-01-01 10:00:00','2020-01-01 10:00:00'),(3030,2090,'2090-3030.jpg',0,'2020-03-03 10:00:00','2020-03-03 10:00:00'),(3031,2090,'2090-3031.jpg',1,'2020-03-03 10:00:00','2020-03-03 10:00:00');
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category_product`
--

DROP TABLE IF EXISTS `category_product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `category_product` (
  `category_id` int(10) unsigned NOT NULL,
  `product_id` int(10) unsigned NOT NULL,
  KEY `category_product_category_id_index` (`category_id`),
  KEY `category_product_product_id_index` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `category_product` WRITE;
/*!40000 ALTER TABLE `category_product` DISABLE KEYS */;
INSERT INTO `category_product` VALUES (1,1001),(4,1001),(5,1001),(1,1009),(4,1009),(5,1009),(22,1009),(23,1009),(40,1009),(44,1009),(45,1009),(46,1009),(47,1009),(48,1009),(49,1009),(50,1009),(71,1009),(73,1009),(97,1009),(1,1015),(4,1015),(1,1044),(22,1044),(46,1044),(97,1044),(1,1101),(22,1101),(44,1101),(45,1101),(47,1101),(97,1101),(1,1200),(22,1200),(49,1200),(1,1250),(22,1250),(1,1300),(22,1300),(44,1300),(45,1300),(1,1301),(22,1301),(44,1301),(1,1302),(22,1302),(1,1350),(5,1350),(1,1400),(31,1400),(72,1400),(1,1450),(5,1450),(30,1450),(2,1500),(70,1500),(2,1600),(60,1600),(61,1600),(68,1600),(2,1601),(62,1601),(2,1602),(63,1602),(2,1603),(64,1603),(2,1604),(65,1604),(2,1605),(66,1605),(2,1606),(67,1606),(55,1700),(56,1700),(15,1800),(3,1850),(1,1900),(1,1950),(22,1950),(46,1950),(1,2000),(22,2000),(45,2000),(94,2050),(1,2090),(22,2090),(49,2090),(97,2090),(98,2090);
/*!40000 ALTER TABLE `category_product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orders` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `number` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','paid','shipped','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipping` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipping_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_address` text COLLATE utf8mb4_unicode_ci,
  `shipping_country` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_number_unique` (`number`),
  KEY `orders_user_id_index` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,1,'MOCK-2020-0001','shipped','USD',1850.00,95.00,1945.00,'Mock Customer One','1 Example Lane\nTestville','SG','bank_transfer',NULL,'2020-12-01 10:00:00','2020-12-20 10:00:00'),(2,2,'MOCK-2021-0002','paid','USD',2400.00,0.00,2400.00,'Mock Customer Two','2 Sample Road\nUnit 3\nExampleton','ID','paypal','Collect at the showroom','2021-09-09 09:00:00','2021-09-09 09:09:09'),(3,4,'MOCK-2022-0003','cancelled','USD',460.00,45.00,505.00,'Mock Customer O\'Four','4 Placeholder Street\nNowhere','NL','paypal',NULL,'2022-02-02 10:00:00','2022-02-03 10:00:00');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `product_id` int(10) unsigned DEFAULT NULL,
  `sku` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int(10) unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_items_order_id_index` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,1001,'M.0001','Southeast Asia map - Year 1661',1850.00,1,'2020-12-01 10:00:00','2020-12-01 10:00:00'),(2,2,1200,'M.0300','Map of the Moluccas - Year 1725',2400.00,1,'2021-09-09 09:00:00','2021-09-09 09:00:00'),(3,3,1606,'P.0237','Buitenzorg palace gardens',460.00,1,'2022-02-02 10:00:00','2022-02-02 10:00:00');
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wishlists`
--

DROP TABLE IF EXISTS `wishlists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wishlists` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `product_id` int(10) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `wishlists_user_id_index` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `wishlists` WRITE;
/*!40000 ALTER TABLE `wishlists` DISABLE KEYS */;
INSERT INTO `wishlists` VALUES (1,1,1009,'2021-01-01 10:00:00','2021-01-01 10:00:00'),(2,2,1001,'2020-11-11 11:11:11','2020-11-11 11:11:11'),(3,3,2090,'2022-06-06 06:06:06','2022-06-06 06:06:06'),(4,3,1350,'2019-12-01 10:00:00','2019-12-01 10:00:00');
/*!40000 ALTER TABLE `wishlists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_requests`
--

DROP TABLE IF EXISTS `product_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_requests` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `type` enum('price','enquiry') COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `product_requests` WRITE;
/*!40000 ALTER TABLE `product_requests` DISABLE KEYS */;
INSERT INTO `product_requests` VALUES (1,'price',1044,3,NULL,NULL,NULL,'2022-07-07 07:07:07','2022-07-07 07:07:07'),(2,'enquiry',1101,NULL,'Mock Visitor','mock.visitor@example.invalid','Is this map still available? (mock enquiry text)','2023-01-15 15:15:15','2023-01-15 15:15:15'),(3,'price',2050,NULL,'Mock Visitor Two','mock.visitor.two@example.invalid',NULL,'2024-02-02 02:02:02','2024-02-02 02:02:02');
/*!40000 ALTER TABLE `product_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `newsletter_subscribers`
--

DROP TABLE IF EXISTS `newsletter_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `newsletter_subscribers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consent_at` timestamp NULL DEFAULT NULL,
  `consent_source` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unsubscribed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `newsletter_subscribers_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `newsletter_subscribers` WRITE;
/*!40000 ALTER TABLE `newsletter_subscribers` DISABLE KEYS */;
INSERT INTO `newsletter_subscribers` VALUES (1,'customer.one@example.invalid','Mock Customer One','2019-03-01 08:05:00','footer-form',NULL,'2019-03-01 08:05:00','2019-03-01 08:05:00'),(2,'reader.one@example.invalid',NULL,'2020-10-10 10:10:10','newsletter-page',NULL,'2020-10-10 10:10:10','2020-10-10 10:10:10'),(3,'reader.two@example.invalid',NULL,NULL,NULL,NULL,'2018-11-11 11:11:11','2018-11-11 11:11:11'),(4,'reader.three@example.invalid','Mock Reader Three','2021-04-04 04:04:04','footer-form','2023-03-03 03:03:03','2021-04-04 04:04:04','2023-03-03 03:03:03');
/*!40000 ALTER TABLE `newsletter_subscribers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pages`
--

DROP TABLE IF EXISTS `pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pages_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `pages` WRITE;
/*!40000 ALTER TABLE `pages` DISABLE KEYS */;
INSERT INTO `pages` VALUES (1,'about-us','About Us','<p>Mock about text.</p>','2021-07-20 10:00:00','2021-07-20 10:00:00'),(2,'faq','FAQ','<p>Work in progress</p>','2021-07-20 10:00:00','2021-07-20 10:00:00'),(3,'privacy-policy','Privacy Policy','<p>Mock privacy text.</p>','2021-07-20 10:00:00','2021-07-20 10:00:00'),(4,'terms-conditions','Terms & Conditions','<p>Work in progress</p>','2021-07-20 10:00:00','2021-07-20 10:00:00'),(5,'sell-to-us','Sell To Us','<p>Mock consignment text.</p>','2021-07-20 10:00:00','2021-07-20 10:00:00');
/*!40000 ALTER TABLE `pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-30  0:00:00
