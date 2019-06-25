import React, { Component } from "react";
import { TouchableOpacity, ScrollView, StyleSheet, Text, View, Image, Dimensions } from "react-native";

import { openDatabase } from 'react-native-sqlite-storage';
import EachDiaryView from "./EachDiaryView";

export default class MainView extends Component {
    state = {
        mainText: "Main Here!",
        diary: [{
            id: 0,
            name: '스페인'
        },
        {
            id: 1,
            name: '독일'
        },
        {
            id: 2,
            name: '일본'
        },
        ],
		selectMainPage:'diaryMainView',
		mainDiaryView:[],
		test:'<Text>hello</Text>',
		
    }
    constructor(props) {
        super(props);
    } 
	onClickDiary = (inputId) => {
		this.setState({mainDiaryView:<EachDiaryView/> });
	}
	componentWillMount(){	
        for (let i = 0; i < this.state.diary.length + 1; i++) {
            if (i == this.state.diary.length) {
                this.state.mainDiaryView.push(
					<TouchableOpacity onPress={()=>this.onClickDiary(-1)}>
						<DiaryView arr={null} />
					</TouchableOpacity>
				);//클릭 이벤트 = 다이어리 추가 컴포넌트
                break;
            }
            this.state.mainDiaryView.push(
				<TouchableOpacity onPress={()=>this.onClickDiary(this.state.diary[i].id)}>
					<DiaryView arr={this.state.diary[i]} />
				</TouchableOpacity>
			);
        }
	}
    componentDidMount() {
        console.log('window width: ' + Dimensions.get("window").width);
    }

    render() {
        return (
            <View style={styles.container}>
                {/*메인 JSX내부 주석처리*/}
                <View style={styles.headerView}>
                    <View style={styles.headerViewText}>
                        <Text style={styles.headerText}>개발중.....</Text>
                        <View style={styles.headerButton}>
                            <Image style={styles.headerIcon} source={require('./../assets/settings.png')}></Image>
                        </View>
                    </View>

                </View>
                <View style={styles.mainView}>
                    <ScrollView>
                        <View style={styles.scrollView}>
                            {this.state.mainDiaryView}
                        </View>
						<View dangerouslySetInnerHTML={ {__html: this.state.test}}></View>
                    </ScrollView>
                </View>
            </View>
        );
    }

}
function DiaryView({ arr }) {
    if (arr != null) {
        console.log(arr.index, arr.id, arr.name);
        //DB접속해서 key값에 맞는 사진 찾아와서 ImageView로 출력하기
        return (
            <View style={diaryStyles.diaryView}>
                <Image style={diaryStyles.diaryImage} source={require('./../assets/diary1.png')}></Image>
                <Text style={diaryStyles.diaryText}>{arr.id}{arr.name} </Text>
            </View>
        );
    }
    else {
        return (
            <View style={diaryStyles.diaryView}>
                <Image style={diaryStyles.diaryImage} source={require('./../assets/diary1_plus.png')}></Image>
                <Text style={diaryStyles.diaryText}>{"null"}{"null"} </Text>
            </View>
        );
    }

}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },

    headerView: {
        flex: 1.30,
        borderBottomWidth: 1,
        borderColor: '#BDBDBD',
    },
    headerViewText: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',//세로정렬
        paddingLeft: 20,
        paddingTop: 5,
        justifyContent: 'space-between',
    },
    headerText: {
        fontSize: 21,
        color: '#878787',
    },
    headerButton: {
        flexDirection: 'row',
    },
    headerIcon: {
        width: 30,
        height: 30,
        marginRight: 15,
        tintColor: 'red',
    },

    mainView: {
        flex: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        display: 'flex',
        flexWrap: 'wrap',
        flexDirection: 'row',
    },
});

const diaryStyles = StyleSheet.create({
    diaryView: {
        margin: 10,
    },
    diaryImage: {
        width: (Dimensions.get("window").width) / 2 - 20,
        height: ((Dimensions.get("window").width) / 2 - 20) * 1.4,
        resizeMode: 'stretch',
    },
    diaryText: {

    },
});



