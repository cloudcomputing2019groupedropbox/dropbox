-- MySQL dump 10.13  Distrib 5.5.62, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: dropbox
-- ------------------------------------------------------
-- Server version	5.5.62-0ubuntu0.14.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `group_user_relation`
--

DROP TABLE IF EXISTS `group_user_relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `group_user_relation` (
  `group_index` int(11) NOT NULL,
  `group_member_user_id` varchar(200) NOT NULL,
  `group_name` varchar(400) DEFAULT NULL,
  `group_leader` varchar(200) DEFAULT NULL,
  KEY `group_index_idx` (`group_index`),
  KEY `user_index_idx` (`group_member_user_id`),
  CONSTRAINT `group_index` FOREIGN KEY (`group_index`) REFERENCES `groups` (`group_index`),
  CONSTRAINT `member_id` FOREIGN KEY (`group_member_user_id`) REFERENCES `users` (`user_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_user_relation`
--

LOCK TABLES `group_user_relation` WRITE;
/*!40000 ALTER TABLE `group_user_relation` DISABLE KEYS */;
INSERT INTO `group_user_relation` VALUES (62,'min2','fds','user'),(62,'user','fds','user'),(63,'david','group','ganghun'),(63,'ganghun','group','ganghun'),(64,'testtest','shareFolder','testid'),(64,'testid','shareFolder','testid'),(65,'min2','share','testid'),(65,'testid','share','testid'),(65,'min2','share','testid'),(65,'testid','share','testid'),(67,'ganghun','mkdir','user'),(67,'user','mkdir','user'),(68,'ganghun','newf','user'),(68,'user','newf','user'),(69,'testtest','teamShare','testid'),(69,'min2','teamShare','testid'),(69,'ganghun','teamShare','testid'),(69,'user','teamShare','testid'),(69,'testid','teamShare','testid'),(70,'ganghun','team1','testid'),(70,'testid','team1','testid');
/*!40000 ALTER TABLE `group_user_relation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `groups` (
  `group_index` int(11) NOT NULL AUTO_INCREMENT,
  `group_name` varchar(400) NOT NULL,
  `group_member_total_num` int(11) DEFAULT NULL,
  `group_leader_user_id` varchar(200) NOT NULL,
  PRIMARY KEY (`group_index`),
  UNIQUE KEY `groups_index_UNIQUE` (`group_index`),
  KEY `leader_idx` (`group_leader_user_id`),
  CONSTRAINT `leader` FOREIGN KEY (`group_leader_user_id`) REFERENCES `users` (`user_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `groups`
--

LOCK TABLES `groups` WRITE;
/*!40000 ALTER TABLE `groups` DISABLE KEYS */;
INSERT INTO `groups` VALUES (62,'fds',NULL,'user'),(63,'group',NULL,'ganghun'),(64,'shareFolder',NULL,'testid'),(65,'share',NULL,'testid'),(66,'share',NULL,'testid'),(67,'mkdir',NULL,'user'),(68,'newf',NULL,'user'),(69,'teamShare',NULL,'testid'),(70,'team1',NULL,'testid');
/*!40000 ALTER TABLE `groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share`
--

DROP TABLE IF EXISTS `share`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `share` (
  `share_file_index` int(11) NOT NULL,
  `share_file_url` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`share_file_index`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share`
--

LOCK TABLES `share` WRITE;
/*!40000 ALTER TABLE `share` DISABLE KEYS */;
/*!40000 ALTER TABLE `share` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `user_index` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(200) NOT NULL,
  `user_pw` varchar(400) NOT NULL,
  `user_email` varchar(200) DEFAULT NULL,
  `user_phone` int(20) DEFAULT NULL,
  `user_name` varchar(100) DEFAULT NULL,
  `salt` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`user_index`),
  UNIQUE KEY `users_index_UNIQUE` (`user_index`),
  UNIQUE KEY `users_id_UNIQUE` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (19,'user','ba7d6a75de8364fe2fef05783acd31d8','u@u.com',10,NULL,NULL),(20,'minhye','c57f1bbe6a14e9d154d838153bcf3ebc','minhye@example.com',0,NULL,NULL),(21,'testid','a52b99d6df2841669f165586514a6da2','testid@khu.ac.kr',10,NULL,NULL),(22,'user2','ba7d6a75de8364fe2fef05783acd31d8','user2@u.com',7432,NULL,NULL),(23,'user3','ba7d6a75de8364fe2fef05783acd31d8','user3@u.com',112312,NULL,NULL),(24,'testtest','a52b99d6df2841669f165586514a6da2','testtest@khu.ac.kr',1012345446,NULL,NULL),(25,'min','ba7d6a75de8364fe2fef05783acd31d8','min@naver.com',11,NULL,NULL),(26,'min2','ba7d6a75de8364fe2fef05783acd31d8','dlalsgp001@naver.com',1011111111,NULL,NULL),(27,'blah','ba7d6a75de8364fe2fef05783acd31d8','b@b.com',123,NULL,NULL),(28,'ganghun','3f565894e586c0bca5d3fa0f24e136f9','aaaaaa',1012341234,NULL,NULL),(29,'david','9878ba8d929b0e8bf03d91dc0f8b41ba','david@khu.ac.kr',1012345678,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2019-06-12 23:32:12
