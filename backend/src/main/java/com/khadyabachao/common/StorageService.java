package com.khadyabachao.common;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface StorageService {
    String store(MultipartFile file, String extension) throws IOException;
}
