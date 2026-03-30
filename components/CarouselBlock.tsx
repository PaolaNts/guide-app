import React, { useMemo, useState } from "react";
import {
  View,
  Image,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
} from "react-native";

type CarouselImage =
  | string
  | {
      id?: string;
      url?: string;
      publicId?: string | null;
    };

type CarouselBlockProps = {
  images: CarouselImage[];
};

const { width } = Dimensions.get("window");
const ITEM_WIDTH = width - 32;

function makeId() {
  // @ts-ignore
  return global?.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export default function CarouselBlock({ images }: CarouselBlockProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedImages = useMemo(() => {
    if (!Array.isArray(images)) return [];

    return images
      .map((item) => {
        if (typeof item === "string") {
          return {
            id: makeId(),
            url: item,
            publicId: null,
          };
        }

        return {
          id: item?.id ?? makeId(),
          url: item?.url ?? "",
          publicId: item?.publicId ?? null,
        };
      })
      .filter((item) => item.url);
  }, [images]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_WIDTH);
    setActiveIndex(index);
  };

  if (!normalizedImages.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={normalizedImages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => item.id || String(index)}
        onMomentumScrollEnd={handleScroll}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: item.url }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}
      />

      {normalizedImages.length > 1 && (
        <View style={styles.dotsContainer}>
          {normalizedImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeIndex === index && styles.activeDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 1,
  },
  listContent: {
    paddingHorizontal: 1,
  },
  imageWrapper: {
    width: ITEM_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: ITEM_WIDTH,
    height: 260,
    backgroundColor: "#fcfcfc",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#8B83E4",
  },
});