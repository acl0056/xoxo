using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Windows.UI.Text;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Media;

namespace Easycoustics.Transition.CircuitEditor.OnScreenComponents
{
    public class TransducerScreen : ScreenComponentBase
    {
        public override int[,] TerminalPositions
        {
            get => new int[,] { { 40, 20 }, { 40, 140 } };
        }

        public override double SchematicWidth => 120;
        public override double SchematicHeight => 160;

        public TextBlock txtComponentName;
        public TextBlock txtDescription;
        public TextBlock txtPositiveSign;

        private ContentControl symbolTransducer;
        private Transducer SerializableTransducer { get; }

        public TransducerScreen(Transducer transducer) : base(transducer)
        {
            SerializableTransducer = transducer;

            symbolTransducer = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolSpeaker"]
            };
            transducer.TransducerReversed += reverse;

            ComponentCanvas.Children.Add(symbolTransducer);
            Canvas.SetTop(symbolTransducer, 19);
            Canvas.SetLeft(symbolTransducer, 19);

            txtComponentName = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = transducer
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.RenderTransform = new TranslateTransform() { };
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);

            txtDescription = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b2 = new Binding()
            {
                Path = new PropertyPath("Description"),
                Mode = BindingMode.OneWay,
                Source = transducer
            };
            txtDescription.SetBinding(TextBlock.TextProperty, b2);
            txtDescription.RenderTransform = new TranslateTransform() { };
            txtDescription.SizeChanged += delegate { setPositionTextBoxes(this.SerializableComponent); };
            Children.Add(txtDescription);


            txtPositiveSign = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                Text = "+",
                Visibility = Visibility.Collapsed
            };

            ComponentCanvas.Children.Add(txtPositiveSign);
            Canvas.SetTop(txtPositiveSign, 19);
            Canvas.SetLeft(txtPositiveSign, 19);




            postConstruct();
        }

        private void reverse()
        {
            if (!SerializableTransducer.PolarityReverse)
                symbolTransducer.ContentTemplate = (DataTemplate)Application.Current.Resources["symbolSpeaker"];
            else
                symbolTransducer.ContentTemplate = (DataTemplate)Application.Current.Resources["symbolSpeakerReversed"];
            
        }

        public override void setPositionTextBoxes(SerializableElement element)
        {
            bool showPositiveSign = ((Transducer)SerializableComponent).OutputVoltageAcross ||
                                   ((Transducer)SerializableComponent).OutputCurrentThrough;

            txtPositiveSign.Visibility = showPositiveSign ? Visibility.Visible : Visibility.Collapsed;
        }
    }
}
