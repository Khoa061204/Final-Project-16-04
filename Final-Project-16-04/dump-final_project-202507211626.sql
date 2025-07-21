-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: final_project
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL DEFAULT 'Untitled Document',
  `content` longtext,
  `userId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `s3Key` varchar(512) DEFAULT NULL,
  `folder_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
INSERT INTO `documents` VALUES ('0534a46b-6e7b-47c7-8df5-018970e8bb28','123.txt','\"{\\\"type\\\":\\\"doc\\\",\\\"content\\\":[{\\\"type\\\":\\\"paragraph\\\",\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"\\\"}]}]}\"',4,'2025-05-13 12:34:19','2025-05-13 12:34:19','documents/4/1747139657941-123_txt',NULL),('0bebe26d-a825-41b0-859c-17c7edf4f876','test1','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 12:23:04','2025-05-13 12:23:04',NULL,NULL),('0f12f141-8164-4050-b570-b75bba50ced8','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 09:19:52','2025-05-13 09:19:52',NULL,NULL),('1352fa75-5601-44f9-a3c5-27014612ff11','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 10:48:16','2025-05-13 10:48:17',NULL,NULL),('15a9d766-5504-4a9f-a29e-67650d3778a3','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 11:54:56','2025-05-13 11:54:56',NULL,NULL),('2d0dc0b8-8535-4c1b-a8c4-ad31a2e7c233','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 10:09:28','2025-05-13 10:09:28',NULL,NULL),('32ba9778-00e2-46d9-b794-be3476e675e4','123','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]}',2,'2025-05-23 15:42:28','2025-05-23 15:52:45','documents/2/1748014947607-123',NULL),('4013e08e-5fbc-421c-847f-0f2b0e31bad4','12345.txt','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"text\":\"{\\\"type\\\":\\\"doc\\\",\\\"content\\\":[{\\\"type\\\":\\\"paragraph\\\",\\\"attrs\\\":{\\\"textAlign\\\":null},\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"Cloud Collaboration App ( Microsoft 365 like web application )\\\"}]},{\\\"type\\\":\\\"paragraph\\\",\\\"attrs\\\":{\\\"textAlign\\\":null},\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"- Login, Register, Forgot Password.\\\"}]},{\\\"type\\\":\\\"paragraph\\\",\\\"attrs\\\":{\\\"textAlign\\\":null},\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"- User Profile.\\\"}]},{\\\"type\\\":\\\"paragraph\\\",\\\"attrs\\\":{\\\"textAlign\\\":null},\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"- Document Cloud. ( maybe other type like code file and image if there are time.)\\\"}]},{\\\"type\\\":\\\"paragraph\\\",\\\"attrs\\\":{\\\"textAlign\\\":null},\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"- Real-time Collaboration application ( Document and code will be similar to Google Doc, image editing will be similar to paint)\\\"}]},{\\\"type\\\":\\\"paragraph\\\",\\\"attrs\\\":{\\\"textAlign\\\":null},\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"- Teams ( Add, Invite team member ), Employment Roles.\\\"}]},{\\\"type\\\":\\\"paragraph\\\",\\\"attrs\\\":{\\\"textAlign\\\":null},\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"- Project ( Minimum : Create Project - Choose which team to share with - Add Task - Deadlines, If there are time, add agile- like feature like sprint 1, sprint 2, feedback etc ) \\\"}]},{\\\"type\\\":\\\"paragraph\\\",\\\"attrs\\\":{\\\"textAlign\\\":null},\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"- Notification - Notify user of Deadlines, Invite to Teams, or if somebody have shared a file with them\\\"}]}]}\"}]}]}',2,'2025-06-28 13:56:02','2025-07-19 04:15:09','documents/2/1751118960962-12345_txt',NULL),('41a125c1-b82b-4449-8804-5e794cde0c22','123','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]}',2,'2025-05-17 03:38:05','2025-07-03 04:11:33','documents/2/1747453084196-123',NULL),('4e1b2a00-4408-4fb5-8790-a3e668cbd43f','123','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]}',2,'2025-05-20 19:32:10','2025-05-20 19:32:11','documents/2/1747769529088-123',NULL),('531a81da-d9a8-455c-bbc9-eae6a461b58b','123','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":\"center\"},\"content\":[{\"type\":\"text\",\"text\":\"123123\"}]}]}',2,'2025-07-18 16:30:47','2025-07-18 16:31:01','documents/2/1752856246722-123',NULL),('645a7abe-1aca-4e80-9049-4c05c96b6fb5','123.txt','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 12:26:09','2025-05-13 12:26:09',NULL,NULL),('6f7af946-88d1-4a11-a91f-38ce0bf13446','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 12:20:18','2025-05-13 12:20:18',NULL,NULL),('7338fbdd-cf74-43c7-bf6d-903990afc0f4','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 12:14:26','2025-05-13 12:14:26',NULL,NULL),('7877089e-fcb6-429d-8cf2-9ef50c94857d','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 10:15:47','2025-05-13 10:21:04',NULL,NULL),('91078f85-0d3d-407b-8da8-b1905b9034cf','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 12:01:14','2025-05-13 12:01:14',NULL,NULL),('9a1d4417-0d7b-4c59-9e81-51e8efa2721d','12345678','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]}',2,'2025-05-20 14:37:08','2025-05-20 20:25:02','documents/2/1747751827204-12345678',NULL),('9aa82b55-c770-4e33-9280-921b9153a07a','12345','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}},{\"type\":\"table\",\"content\":[{\"type\":\"tableRow\",\"content\":[{\"type\":\"tableHeader\",\"attrs\":{\"colspan\":1,\"rowspan\":1,\"colwidth\":null},\"content\":[{\"type\":\"image\",\"attrs\":{\"src\":\"https://th.bing.com/th/id/OIP.pzQ2E2KxjUjzhh9YMn7ZrAHaD3?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3\",\"alt\":null,\"title\":null}},{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]},{\"type\":\"tableHeader\",\"attrs\":{\"colspan\":1,\"rowspan\":1,\"colwidth\":null},\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"text\":\"asdasd\"}]}]},{\"type\":\"tableHeader\",\"attrs\":{\"colspan\":1,\"rowspan\":1,\"colwidth\":[30]},\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]}]},{\"type\":\"tableRow\",\"content\":[{\"type\":\"tableCell\",\"attrs\":{\"colspan\":1,\"rowspan\":1,\"colwidth\":null},\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]},{\"type\":\"tableCell\",\"attrs\":{\"colspan\":1,\"rowspan\":1,\"colwidth\":null},\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]},{\"type\":\"tableCell\",\"attrs\":{\"colspan\":1,\"rowspan\":1,\"colwidth\":[30]},\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]}]},{\"type\":\"tableRow\",\"content\":[{\"type\":\"tableCell\",\"attrs\":{\"colspan\":1,\"rowspan\":1,\"colwidth\":null},\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]},{\"type\":\"tableCell\",\"attrs\":{\"colspan\":1,\"rowspan\":1,\"colwidth\":null},\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]},{\"type\":\"tableCell\",\"attrs\":{\"colspan\":1,\"rowspan\":1,\"colwidth\":[30]},\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]}]}]},{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"#332e2e\"}}],\"text\":\")\"}]},{\"type\":\"heading\",\"attrs\":{\"textAlign\":null,\"level\":1},\"content\":[{\"type\":\"text\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"#332e2e\"}}],\"text\":\"- Login, Register, Forgot Password.\"}]},{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"#332e2e\"}}],\"text\":\"- User Profile.312311321123\"}]},{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"#332e2e\"}}],\"text\":\"- Document Cloud. ( maybe other type like code file and image if there are time.)\"}]},{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"#332e2e\"}}],\"text\":\"- Real-time Collaboration application ( Document and code will be similar to Google Doc, image editing will be similar to paint)\"}]},{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"#332e2e\"}}],\"text\":\"- Teams ( Add, Invite team member ), Employment Roles.\"}]},{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"#332e2e\"}}],\"text\":\"- Project ( Minimum : Create Project - Choose which team to share with - Add Task - Deadlines, If there are time, add agile- like feature like sprint 1, sprint 2, feedback etc ) \"}]},{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":\"left\"},\"content\":[{\"type\":\"text\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"#332e2e\"}}],\"text\":\"- Notification - Notify user of Deadlines, Invite to Teams, or if somebody have shared a file with them\"}]}]}',2,'2025-05-17 03:59:38','2025-07-19 04:16:12','documents/2/1747454377117-12345',NULL),('9dfb9d6b-bc0c-4bed-909d-73c4c48af902','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 12:20:13','2025-05-13 12:20:13',NULL,NULL),('a626d2a2-2825-490d-b3fb-e618ac529b17','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 10:21:06','2025-05-13 10:40:58',NULL,NULL),('addda26b-9c02-4161-8728-b77fb9d66c4f','Test1.txt','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 12:33:39','2025-05-13 12:33:39',NULL,NULL),('afbe25fa-92db-4596-bd11-113543a44908','1234','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]}',2,'2025-06-14 05:27:57','2025-07-05 02:18:35','documents/2/1749878876147-1234',NULL),('b1a28a94-f7f1-4653-9d32-3411b5031832','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 11:48:26','2025-05-13 11:48:27',NULL,NULL),('b91b5660-c963-4775-9343-edb9c36e6f56','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 11:53:20','2025-05-13 11:53:20',NULL,NULL),('bef89bfd-8400-4a17-8708-75c1e7867e8f','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 12:20:15','2025-05-13 12:20:15',NULL,NULL),('d45483c4-4759-46a8-a423-b60f27b3ee56','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 09:35:53','2025-05-13 09:35:53',NULL,NULL),('d4d1e9fc-b4c3-4b01-9e5e-623eb57845a6','Untitled Document','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}',4,'2025-05-13 11:55:15','2025-05-13 11:55:15',NULL,NULL),('d5c94215-65c5-4dfb-bfa8-79a6f14e2927','123','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null}}]}',6,'2025-05-23 15:46:52','2025-05-24 03:10:16','documents/6/1748015211263-123',NULL),('e943a225-5dd9-416c-93d8-0f045475b580','1231515','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"text\":\"12321313123141\"}]}]}',4,'2025-07-19 04:47:39','2025-07-19 05:39:56','documents/4/1752900458302-1231515',NULL),('f6555c76-ea1d-4c74-9841-6d3184cc7bc0','123.txt','\"{\\\"type\\\":\\\"doc\\\",\\\"content\\\":[{\\\"type\\\":\\\"paragraph\\\",\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"\\\"}]}]}\"',4,'2025-05-13 12:34:31','2025-05-13 12:34:31','documents/4/1747139670477-123_txt',NULL);
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `start` datetime NOT NULL,
  `end` datetime NOT NULL,
  `allDay` tinyint NOT NULL DEFAULT '0',
  `userId` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `files`
--

DROP TABLE IF EXISTS `files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_url` text NOT NULL,
  `uploaded_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `s3Key` varchar(512) DEFAULT NULL,
  `folder_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `files`
--

LOCK TABLES `files` WRITE;
/*!40000 ALTER TABLE `files` DISABLE KEYS */;
INSERT INTO `files` VALUES (1,4,'license.txt','https://final-project-gw2025.s3.ap-southeast-2.amazonaws.com/1747136428916-license.txt','2025-05-13 11:40:29.525925','license.txt',NULL),(3,2,'Test1.txt','https://final-project-gw2025.s3.ap-southeast-2.amazonaws.com/files/2/1747383270727-Test1.txt','2025-05-16 08:14:31.329000','Test1.txt',NULL),(12,2,'12345.pdf','https://final-project-gw2025.s3.ap-southeast-2.amazonaws.com/files/12345.pdf','2025-07-15 07:04:54.109000','files/12345.pdf',NULL),(22,2,'2025-07-1514-21-15.mp4','https://final-project-gw2025.s3.ap-southeast-2.amazonaws.com/files/2/2025-07-1514-21-15.mp4','2025-07-17 07:34:23.442000','files/2/2025-07-1514-21-15.mp4',NULL),(23,2,'2022-2023.zip','https://final-project-gw2025.s3.ap-southeast-2.amazonaws.com/files/2/2022-2023.zip','2025-07-18 15:31:05.532000','files/2/2022-2023.zip',NULL),(24,2,'2022-2023.pdf','https://final-project-gw2025.s3.ap-southeast-2.amazonaws.com/files/2/2022-2023.pdf','2025-07-18 16:13:41.022000','files/2/2022-2023.pdf',NULL),(26,2,'2022-2023.pdf','https://final-project-gw2025.s3.ap-southeast-2.amazonaws.com/files/2/2022-2023/2022-2023.pdf','2025-07-19 02:53:48.657000','files/2/2022-2023/2022-2023.pdf',NULL),(27,2,'abc.pdf','https://final-project-gw2025.s3.ap-southeast-2.amazonaws.com/files/2/abc.pdf','2025-07-19 06:36:08.453000','files/2/abc.pdf',NULL);
/*!40000 ALTER TABLE `files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `folders`
--

DROP TABLE IF EXISTS `folders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `folders` (
  `name` varchar(255) NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `path` varchar(1000) DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `folders`
--

LOCK TABLES `folders` WRITE;
/*!40000 ALTER TABLE `folders` DISABLE KEYS */;
INSERT INTO `folders` VALUES ('123','2025-05-24 03:01:33.241044','643fb45a-6a51-4bf9-aea1-1c355a60a339/643fb45a-6a51-4bf9-aea1-1c355a60a339/5b8485ac-7e29-43bd-a03d-06ef6b7a296a',1,NULL),('2022-2023','2025-07-19 02:53:41.321233','2022-2023',2,NULL),('123','2025-07-18 16:20:35.367180','d1c3a39f-b422-418f-a314-a3eeebb9aee8',3,NULL);
/*!40000 ALTER TABLE `folders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invitations`
--

DROP TABLE IF EXISTS `invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invitations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teamId` int NOT NULL,
  `inviteeId` int NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invitations`
--

LOCK TABLES `invitations` WRITE;
/*!40000 ALTER TABLE `invitations` DISABLE KEYS */;
INSERT INTO `invitations` VALUES (1,1,6,'accepted','2025-05-20 22:41:21.000000'),(2,2,6,'accepted','2025-05-20 23:35:46.000000'),(4,1,7,'accepted','2025-05-21 00:10:48.000000');
/*!40000 ALTER TABLE `invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teamId` int NOT NULL,
  `userId` int NOT NULL,
  `message` text NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,1,2,'hello','2025-05-21 01:39:49.000000'),(2,1,2,'123','2025-05-21 01:39:51.000000'),(3,1,6,'Hello','2025-05-21 01:40:14.000000'),(4,2,2,'alo','2025-05-21 01:41:47.000000'),(5,2,6,'alo alo nghe ne','2025-05-21 01:41:54.000000'),(6,2,6,'nghe ne ni oi, chat hoat dong roi dung k ba','2025-05-21 01:46:46.000000'),(7,2,2,'dung roi do 3 oi','2025-05-21 01:46:55.000000'),(8,2,2,'xin so chua :))','2025-05-21 01:46:59.000000'),(9,1,2,'12345','2025-05-23 22:39:05.000000'),(10,1,6,'12344','2025-05-24 09:44:24.000000'),(11,1,2,'Anyeonhaseyo','2025-05-24 09:44:41.000000'),(12,1,2,'1231231','2025-05-24 10:56:41.000000'),(13,1,2,'1234','2025-06-04 17:12:12.000000'),(14,1,6,'^$^346','2025-06-04 17:12:22.000000'),(15,1,2,'!@#!@#$','2025-06-14 11:31:54.000000'),(16,1,2,'1234','2025-06-14 12:32:51.000000'),(17,1,2,'12313','2025-07-05 08:48:53.000000'),(18,1,2,'123','2025-07-19 10:42:25.000000');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `teamId` int DEFAULT NULL,
  `createdAt` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `dueDate` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (2,'ABC Company','Test Tasks, Project',1,'2025-06-26 18:07:25.000000','2025-06-26 18:07:25.000000','2025-07-31'),(3,'ABC Company 2','123',1,'2025-06-26 18:28:42.000000','2025-06-26 18:28:42.000000','2025-07-31'),(4,'234','234324',1,'2025-06-26 18:43:23.000000','2025-06-26 18:43:23.000000',NULL);
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shares`
--

DROP TABLE IF EXISTS `shares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shares` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_type` enum('file','document') NOT NULL,
  `item_id` int NOT NULL,
  `shared_by` int NOT NULL,
  `shared_with` varchar(255) NOT NULL,
  `shared_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_item` (`item_type`,`item_id`),
  KEY `idx_shared_with` (`shared_with`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shares`
--

LOCK TABLES `shares` WRITE;
/*!40000 ALTER TABLE `shares` DISABLE KEYS */;
/*!40000 ALTER TABLE `shares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `projectId` int NOT NULL,
  `dueDate` date DEFAULT NULL,
  `assignedUserId` int DEFAULT NULL,
  `priority` enum('Low','Medium','High') DEFAULT NULL,
  `completedByUserId` int DEFAULT NULL,
  `completedAt` datetime DEFAULT NULL,
  `userStory` varchar(255) DEFAULT NULL,
  `storyPoints` int DEFAULT NULL,
  `status` enum('To Do','In Progress','Done') NOT NULL DEFAULT 'To Do',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES (4,'123','123',2,'2025-06-21',2,'Low',2,'2025-06-28 10:56:41',NULL,NULL,'To Do','2025-07-19 11:03:50.946394','2025-07-19 11:03:50.990420'),(5,'123','132',2,'2025-06-20',2,'Medium',2,'2025-06-27 02:41:03',NULL,NULL,'To Do','2025-07-19 11:03:50.946394','2025-07-19 11:03:50.990420'),(9,'123','123',2,'2025-07-05',2,'Low',2,'2025-07-18 23:34:54',NULL,NULL,'To Do','2025-07-19 11:03:50.946394','2025-07-19 11:03:50.990420'),(10,'312313','1231231',2,'2025-07-10',2,'Medium',2,'2025-07-18 23:34:55',NULL,NULL,'To Do','2025-07-19 11:03:50.946394','2025-07-19 11:03:50.990420');
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_members`
--

DROP TABLE IF EXISTS `team_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_members` (
  `team_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`team_id`,`user_id`),
  KEY `IDX_fdad7d5768277e60c40e01cdce` (`team_id`),
  KEY `IDX_c2bf4967c8c2a6b845dadfbf3d` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_members`
--

LOCK TABLES `team_members` WRITE;
/*!40000 ALTER TABLE `team_members` DISABLE KEYS */;
INSERT INTO `team_members` VALUES (1,2),(1,6),(1,7),(2,2),(2,6);
/*!40000 ALTER TABLE `team_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `creator_id` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
INSERT INTO `teams` VALUES (1,'123',2,'2025-05-18 19:20:43'),(2,'test2',2,'2025-05-20 16:35:41');
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `password` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `avatar_url` varchar(10000) DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('$2b$10$pZiijgl4v4r9Jojnmh.7cOm0somLEXgbt80hNx/3AYzIjS6bMNAxS','khoatdgcs2205713@fpt.edu.vn','DangKhoa1661','2025-05-13 12:59:26.150705','2025-05-13 12:59:26.180941',NULL,1),('$2b$10$Ozl9ZlP8KgqadL1GUXereOK4QM4bTw7yReAdxk89DlOVHOsUbsi5u','khoatdgcs220573@fpt.edu.vn','Khoa16612','2025-05-13 12:59:26.150705','2025-06-14 05:26:56.574275',NULL,2),('$2b$10$OolVUfSP.xsHPVVLV6ojaud1uh6HGW9EqqhRZ669xL2OpCPHFiGJ2','khoatdgcs2205732@fpt.edu.vn','Khoa1661','2025-05-13 12:59:26.150705','2025-05-13 12:59:26.180941',NULL,3),('$2b$10$PdEnVb26jDqQFllMiReyouljcm1bKnJAiU4XhqwbxvCtcMactJBne','truongdangkhoa1661@gmail.com','Khoa16611000','2025-05-20 15:06:55.507261','2025-05-20 15:06:55.507261',NULL,4),('$2b$10$W7b1TGcKksJYOO6eryioOOo5Ghp3MZjiTJwawpS.tuyyN.UodeRRO','123@gmail.com','Khoa123123124124','2025-05-20 17:10:18.744529','2025-05-20 17:10:18.744529',NULL,5);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'final_project'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-21 16:26:59
